import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { AuthenticationError } from '@/utils/errors';
import { asyncHandler } from '@/utils/asyncHandler';
import { RateLimitError } from '@/utils/errors';
import { prisma } from '@/lib/prisma';
import { AuthorizationError } from '@/utils/errors';
import { AuthRequest } from '@/types/auth.types';

// import { prisma } from "@/config/database"
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer')) {
    throw new AuthenticationError('Not authenticated');
  }

  const token = auth.split(' ')[1];
  if (!token) {
    throw new AuthenticationError('Token not provided');
  }
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new AuthenticationError('Invalid or expired token'));
  }
};

//  Check if user has completed onboarding
export const requireOnboarding = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboarded: true },
    });

    if (!user?.onboarded) {
      throw new AuthorizationError(
        'Please complete onboarding to access this resource'
      );
    }

    next();
  }
);

//  Check AI request limit
export const checkAILimit = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        aiRequestsUsed: true,
        aiRequestLimit: true,
        lastResetDate: true,
        tier: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
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
      return next();
    }

    // Check if limit reached
    if (user.aiRequestsUsed >= user.aiRequestLimit) {
      throw new RateLimitError(
        `AI request limit exceeded. You have used ${user.aiRequestsUsed}/${user.aiRequestLimit} requests. ${
          user.tier === 'free'
            ? 'Upgrade to Pro for more requests!'
            : 'Limit will reset next month.'
        }`
      );
    }

    next();
  }
);

export const incrementAIRequest = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        aiRequestsUsed: {
          increment: 1,
        },
      },
    });

    next();
  }
);

export const restrictTo = (...allowedTiers: string[]) => {
  return asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      const userTier = req.user!.tier;

      if (!allowedTiers.includes(userTier)) {
        throw new AuthorizationError(
          `This feature is only available for ${allowedTiers.join(
            ', '
          )} users. Please upgrade your plan.`
        );
      }

      next();
    }
  );
};

//  Veriry if user own resource
export const verifyOwnership = (resourceUserIdParam: string = 'userId') => {
  return asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      const authenticatedUserId = req.user!.id;
      const resourceUserId = req.params[resourceUserIdParam];

      if (authenticatedUserId !== resourceUserId) {
        throw new AuthorizationError(
          'You do not have permission to access this resource'
        );
      }

      next();
    }
  );
};
