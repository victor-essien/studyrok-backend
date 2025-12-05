import { Request } from 'express';

// Auth Request
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: string;
    name: string;
  };
}

// Signup Body
export interface SignupBody {
  email: string;
  password: string;
  name: string;
}

// Login Body
export interface LoginBody {
  email: string;
  password: string;
}

//  Onboarding Body
export interface OnboardingBody {
  studyGoal:
    | 'stay_consistent'
    | 'catch_up'
    | 'prepare_exam'
    | 'build_understanding';
  educationLevel: 'high_school' | 'college' | 'grad_school';
}

// Change password Body
export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

// Forgot password Body
export interface ForgotPasswordBody {
  email: string;
}

// Refresh Token Body
export interface RefreshTokenBody {
  refreshToken: string;
}

//  JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  tier: string;
  iat?: number;
  exp?: number;
}

// Password Reset Token
export interface PasswordResetToken {
  userId: string;
  token: string;
  expiresAt: Date;
}

//    Auth Response
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    photo: string | null;
    tier: string;
    onboarded: boolean;
    streak: number;
    totalStudyTime: number;
  };

  accessToken: string;
  refreshToken: string;
}
