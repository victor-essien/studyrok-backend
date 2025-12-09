import { NextFunction, Response } from 'express';
// import { AuthRequest } from "@/types/auth.types";
import { AuthRequest } from '@/types/auth.types';
import authService from './auth.service';
import { asyncHandler } from '@/utils/asyncHandler';
import { sendSuccess, sendCreated, sendNoContent } from '@/utils/apiResponse';
import { clearRefreshCookie, setRefreshCookie } from '@/utils/helpers';

// Auth Controller

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await authService.signup(req.body);
  const refreshToken = result.refreshToken;
  const user = result.user;
  const accessToken = result.accessToken;
  setRefreshCookie(res, refreshToken);
  const sendResult = {
    user,
    accessToken,
  };
  sendCreated(res, 'User registered successfully', sendResult);
});

export const lsogin = asyncHandler(async (req: AuthRequest, res: Response) => {
  console.log('LOGIN returned status:', res.statusCode);
  const result = await authService.login(req.body);
  const refreshToken = result.refreshToken;
  const user = result.user;
  const accessToken = result.accessToken;
  setRefreshCookie(res, refreshToken);
  const sendResult = {
    user,
    accessToken,
  };
  sendSuccess(res, 200, 'Login successful', sendResult);
});
// export const login = asyncHandler(
//     async (req: AuthRequest, res: Response) => {
//         console.log("🟢 LOGIN HANDLER CALLED");
//         try {
//             const result = await authService.login(req.body);
//             const refreshToken = result.refreshToken;
//             const user = result.user;
//             const accessToken = result.accessToken;

//             setRefreshCookie(res, refreshToken);
//             const sendResult = {
//                 user,
//                 accessToken
//             };

//             console.log("✅ LOGIN SUCCESS");
//             sendSuccess(res, 200, 'Login successful', sendResult);
//         } catch (error) {
//             console.log("❌ LOGIN FAILED:", error);
//             throw error; // Re-throw to let error handler catch it
//         }
//     }
// );

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // console.log("🟢 LOGIN HANDLER CALLED");
  try {
    const result = await authService.login(req.body);
    const refreshToken = result.refreshToken;
    const user = result.user;
    const accessToken = result.accessToken;

    setRefreshCookie(res, refreshToken);
    const sendResult = {
      user,
      accessToken,
    };

    console.log('✅ LOGIN SUCCESS');
    sendSuccess(res, 200, 'Login successful', sendResult);
  } catch (error) {
    // console.log("❌ LOGIN FAILED:", error);
    next(error); // Pass error to error handling middleware
  }
};

export const completeOnboarding = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    await authService.completeOnboarding(userId, req.body);
    sendSuccess(res, 200, 'Onboarding completed successfully');
  }
);

export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const user = await authService.getProfile(userId);

    sendSuccess(res, 200, 'Profile retrieved successfully', user);
  }
);

export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const user = await authService.updateProfile(userId, req.body);

    sendSuccess(res, 200, 'Profile updated successfully', user);
  }
);

export const changePassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await authService.changePassword(userId, req.body);

    sendSuccess(res, 200, 'Password changed successfully');
  }
);

export const forgotPassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    const message = await authService.requestPasswordReset(email);

    const responseData =
      process.env.NODE_ENV === 'development'
        ? { message, resetToken: message }
        : { message: 'If the email exists, a reset link has been sent' };

    sendSuccess(res, 200, 'Password reset email sent', responseData);
  }
);

export const resetPassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    sendSuccess(res, 200, 'Password reset successfully');
  }
);

export const refreshToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;
    const token = await authService.refreshToken(refreshToken);
    const newRefreshToken = token.refreshToken;
    const accessToken = token.accessToken;

    setRefreshCookie(res, newRefreshToken);
    sendSuccess(res, 200, 'Token refreshed successfully', accessToken);
  }
);

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;

  await authService.logout(refreshToken);
  clearRefreshCookie(res);

  sendNoContent(res);
});

export const verifyAuth = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;

    sendSuccess(res, 200, 'User is authernticated', {
      authenticated: true,
      user,
    });
  }
);
