// src/middlewares/authMiddleware.ts
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { users } from '../models/schemas/users';
import ErrorResponse from '../utils/errorResponse';
import asyncHandler from './asyncHandler';

// Add user property to Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

/**
 * Protect routes - Verify JWT token
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Get token from authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token
        token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    // Get user from the token
    const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
    });

    if (!user) {
        return next(new ErrorResponse('User not found', 401));
    }

    // Add user to request
    req.user = user;
    next();
});

/**
 * Authorize specific roles
 * @param roles - Roles to authorize
 */
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }

        next();
    };
};

/**
 * Optional authentication - Attach user to request if authenticated
 */
export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;

    // Get token from authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token
        token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    // If no token, continue as guest
    if (!token) {
        return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    // Get user from the token
    const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
    });

    // Add user to request
    if (user) {
        req.user = user;
    }

    next();
});