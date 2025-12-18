import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors';
import { logger, logAuth } from '@/utils/logger';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/utils/jwt';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  REFRESH_TOKEN_EXPIRES,
  ACCESS_TOKEN_EXPIRES,
} from '@/env';
import {
  SignupBody,
  OnboardingBody,
  JWTPayload,
  AuthRequest,
  AuthResponse,
  LoginBody,
  ChangePasswordBody,
} from '@/types/auth.types';
import {
  comparePassword,
  compareToken,
  hashPassword,
  hashToken,
} from '@/utils/hash';
import { msToMillis } from '@/utils/time';
import { setRefreshCookie } from '@/utils/helpers';

// Auth service

class AuthService {
  private readonly JWT_ACCESS_SECRET = JWT_ACCESS_SECRET;
  private readonly JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
  private readonly ACCESS_TOKEN_EXPIRES = ACCESS_TOKEN_EXPIRES;
  private readonly REFRESH_TOKEN_EXPIRES = REFRESH_TOKEN_EXPIRES;

  // Signup new user
  async signup(data: SignupBody): Promise<AuthResponse> {
    const { email, password, name } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash Password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        tier: 'free',
        onboarded: false,
        aiRequestLimit: 50,
        educationLevel: '',
        studyGoal: '',
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        photo: true,
        onboarded: true,
        streak: true,
        totalStudyTime: true,
      },
    });

    // Sign tokens
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      tier: user.tier,
    });
    const refreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      tier: user.tier,
    });
    const hashedRefresh = await hashToken(refreshToken);

    // Get refresh token expiry date
    const expiresAt = new Date(Date.now() + msToMillis(REFRESH_TOKEN_EXPIRES));

    // Save refresh token in Db session
    await prisma.session.create({
      data: {
        userId: user.id,
        hashedRefreshToken: hashedRefresh,
        expiresAt,
      },
    });
    // Log auth event
    logAuth('signup', user.id, { email: user.email });

    logger.info(`New user signup: ${email}`);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  // Login user

  async login(data: LoginBody): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }
    const isPasswordValid = comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }
    // Sign tokens
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      tier: user.tier,
    });
    const refreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      tier: user.tier,
    });
    const hashedRefresh = await hashToken(refreshToken);

    // Get refresh token expiry date
    const expiresAt = new Date(Date.now() + msToMillis(REFRESH_TOKEN_EXPIRES));

    // Save refresh token in Db session
    await prisma.session.create({
      data: {
        userId: user.id,
        hashedRefreshToken: hashedRefresh,
        expiresAt,
      },
    });

    // Log auth event
    logAuth('login', user.id, { email: user.email });

    logger.info(`User login: ${email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        photo: user.photo,
        tier: user.tier,
        onboarded: user.onboarded,
        streak: user.streak,
        totalStudyTime: user.totalStudyTime,
      },
      accessToken,
      refreshToken,
    };
  }
  // Complete user onboarding

  async completeOnboarding(
    userId: string,
    data: OnboardingBody
  ): Promise<void> {
    const { studyGoal, educationLevel } = data;



    // update user with onboarding data
    await prisma.user.update({
      where: { id: userId },
      data: {
        studyGoal,
        educationLevel,
        onboarded: true,
      },
    });

    logger.info(`User completed onboarding: ${userId}`);
  }

  //  Get current user profile

  async getProfile(userId: string) {
    if (!userId) {
      throw new AuthenticationError('ID is required');
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        photo: true,
        tier: true,
        onboarded: true,
        studyGoal: true,
        educationLevel: true,
        totalStudyTime: true,
        streak: true,
        longestStreak: true,
        lastStudyDate: true,
        aiRequestsUsed: true,
        aiRequestLimit: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  // Update user profile

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      photo?: string;
      educationLevel?: string;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        photo: true,
        tier: true,
        onboarded: true,
        studyGoal: true,
        educationLevel: true,
        streak: true,
        totalStudyTime: true,
      },
    });

    logger.info(`User updated profile: ${userId}`);
  }

  // Change Password

  async changePassword(
    userId: string,
    data: ChangePasswordBody
  ): Promise<void> {
    const { currentPassword, newPassword } = data;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }
    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Check if new password is different form current
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      throw new ValidationError(
        'New password must be different from current password'
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    logger.info(`User changed password: ${userId}`);
  }

  async requestPasswordReset(email: string): Promise<string> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not (security)
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return 'If the email exists, a reset link has been sent';
    }

    // Generate reset token
    const resetToken = this.generatePasswordResetToken(user.id);

    // In production, send email with reset link
    // For now, we'll return the token (for testing)
    logger.info(`Password reset token generated for user: ${user.id}`);

    // TODO: Send email with reset link
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    return resetToken;
  }

  //    Reset password with token

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let decoded: JWTPayload;

    try {
      // Verify token
      decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const userId = decoded.id;

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info(`User reset password: ${userId}`);
  }

  // Generate password reset token

  private generatePasswordResetToken(userId: string): string {
    const payload = { userId };

    return jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: '1h', // Reset token expires in 1 hour
    });
  }

  //   Check if the user has reached Ai request limit

  async checkAILimit(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiRequestsUsed: true,
        aiRequestLimit: true,
        lastResetDate: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if we need to reset monthly limit
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);
    const daysSinceReset = Math.floor(
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Reset if it's been 30+ days
    if (daysSinceReset >= 30) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          aiRequestsUsed: 0,
          lastResetDate: now,
        },
      });
      return true;
    }

    // Check if limit reached
    return user.aiRequestsUsed < user.aiRequestLimit;
  }

  //    Increment AI request count
  async incrementAIRequest(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiRequestsUsed: {
          increment: 1,
        },
      },
    });
  }

  async refreshToken(refresshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let decoded: JWTPayload;

    try {
      // Verify refresh token
      decoded = jwt.verify(
        refresshToken,
        this.JWT_REFRESH_SECRET
      ) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    const userId = decoded.id;
    // find matching session by comparing hashed token
    const sessions = await prisma.session.findMany({ where: { userId } });
    let matchedSession = null as any;

    for (const s of sessions) {
      const match = await compareToken(refresshToken, s.hashedRefreshToken);
      if (match) {
        matchedSession = s;
        break;
      }
    }
    if (!matchedSession) {
      throw new AuthenticationError('Refresh token expired');
    }

    // optional: check expiresAt
    if (new Date() > matchedSession.expiresAt) {
      await prisma.session.delete({ where: { id: matchedSession.id } });
      throw new AuthenticationError('Refresh token expired');
    }

    // issue new tokens (rotate)
    const accessToken = signAccessToken({ id: userId });
    const refreshToken = signRefreshToken({ id: userId });
    const hashedNew = await hashToken(refreshToken);

    // update session with new hashed refresh token and new expiry
    const newExpiresAt = new Date(
      Date.now() + msToMillis(this.REFRESH_TOKEN_EXPIRES)
    );
    await prisma.session.update({
      where: { id: matchedSession.id },
      data: { hashedRefreshToken: hashedNew, expiresAt: newExpiresAt },
    });

    logAuth('token_refresh', userId);
    return {
      refreshToken,
      accessToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    let decoded: JWTPayload;

    try {
      // Verify refresh token
      decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
    const userId = decoded.id;
    const sessions = await prisma.session.findMany({ where: { userId } });
    for (const s of sessions) {
      const match = await compareToken(refreshToken, s.hashedRefreshToken);
      if (match) {
        await prisma.session.delete({ where: { id: s.id } });
        break;
      }
    }

    logger.info('Logged Out', userId);
  }
}

export default new AuthService();
