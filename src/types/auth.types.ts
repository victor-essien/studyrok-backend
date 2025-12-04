import { Request } from "express";

export interface AuthRequest extends Request  {
     user?: {
    id: string;
    email: string;
    tier: string;
    name: string;
  };
}

export interface SignupBody {
    email: string;
    password: string;
    name: string;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface OnboardingBody {
  studyGoal: 'exam_prep' | 'skill_building' | 'career_change' | 'curiosity';
  interests: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
}


export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  tier: string;
  iat?: number;
  exp?: number;
}

export interface PasswordResetToken {
  userId: string;
  token: string;
  expiresAt: Date;
}