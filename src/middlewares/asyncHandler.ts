// src/middlewares/asyncHandler.ts
import { NextFunction, Request, Response } from 'express';

/**
 * Wrapper for async controller functions to eliminate try-catch blocks
 * @param fn - Async controller function
 * @returns Express middleware function
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

export default asyncHandler;