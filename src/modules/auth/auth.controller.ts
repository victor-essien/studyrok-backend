import { Response } from "express";
import { AuthRequest } from "@/types/auth.types";
import authService from "./auth.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess, sendCreated, sendNoContent } from "@/utils/apiResponse";
import { setRefreshCookie } from "@/utils/helpers";

// Auth Controller

export const signup = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const result = await authService.signup(req.body)
        const refreshToken = result.refreshToken 
        const user = result.user
        const accessToken = result.accessToken
        setRefreshCookie(res, refreshToken)
        const sendResult = {
            user,
            accessToken
        }
        sendCreated(res, 'User registered successfully', sendResult)
    }
)


export const login = asyncHandler(
    async (req: AuthRequest, res: Response) => {
        const result = await authService.login(req.body);
        const refreshToken = result.refreshToken
        const user = result.user
        const accessToken = result.accessToken
        setRefreshCookie(res, refreshToken)
        const sendResult = {
            user,
            accessToken
        }
        sendSuccess(res, 200, 'Login successful', sendResult)
    }
)