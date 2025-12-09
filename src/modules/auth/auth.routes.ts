import express from 'express';
import * as authController from './auth.controller'
import { validate } from '@/middleware/validation.middleware';
import { authLimiter, passwordResetLimiter } from '@/middleware/rateLimiter.middleware';
import { protect } from '@/middleware/auth.middleware';
import { signupSchema, loginSchema, changePasswordSchema, forgotPasswordSchema , refreshTokenSchema, resetPasswordSchema, updateProfileSchema, onboardingSchema} from './auth.validation';

const router = express.Router();


// Public Routes

//signup
router.post(
    '/signup',
    authLimiter,
    validate(signupSchema),
    authController.signup
)

//login
router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    authController.login
)

//forgotten password
router.post(
    '/forgot-password',
    passwordResetLimiter,
    validate(forgotPasswordSchema),
    authController.forgotPassword
)


// reset password

router.post(
    '/reset-password',
    authLimiter,
    validate(resetPasswordSchema),
    authController.resetPassword
)

router.post(
    '/refresh',
    validate(refreshTokenSchema),
    authController.refreshToken
)


// Protected Routes

router.get('/me', protect, authController.getProfile);

router.get('/verify', protect, authController.verifyAuth)

router.post(
    '/onboarding',
    protect,
    validate(onboardingSchema),
    authController.completeOnboarding
);

router.patch(
    'profile',
    protect,
    validate(updateProfileSchema),
    authController.updateProfile
)

router.post (
    '/change-password',
    protect,
    validate(changePasswordSchema),
    authController.changePassword
);

router.post('/logout', protect, authController.logout);

export default router