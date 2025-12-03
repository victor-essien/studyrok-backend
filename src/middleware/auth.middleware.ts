import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/utils/jwt";
import { AuthenticationError } from "@/utils/errors";
import { asyncHandler } from "@/utils/asyncHandler";
import { RateLimitError } from "@/utils/errors";
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
}


// Check AI request limits
// export const checkAILimit = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const user = await prisma.user.findUnique({
//       where: { id: req.user!.id },
//       select: { aiRequestsUsed: true, aiRequestLimit: true },
//     });

//     if (user!.aiRequestsUsed >= user!.aiRequestLimit) {
//       throw new RateLimitError('AI request limit exceeded. Upgrade your plan.');
//     }

//     next();
//   }
// );