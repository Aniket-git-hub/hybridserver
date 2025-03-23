// middlewares/errorHandler.ts - Global Error Handler
import { NextFunction, Request, Response } from 'express';
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

interface IError extends Error {
    statusCode?: number;
    code?: number;
    errors?: Record<string, { message: string }>;
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const errorHandler = (err: IError, req: Request, res: Response, next: NextFunction): void => {
    let error: IError = { ...err };
    error.message = err.message;

    // Log error for debugging
    logger.error(`${err.name}: ${err.message}`);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new ErrorResponse(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new ErrorResponse(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError' && err.errors) {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new ErrorResponse(message, 400);
    }

    // JSON Web Token error
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token. Please log in again.';
        error = new ErrorResponse(message, 401);
    }

    // JWT expired error
    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired. Please log in again.';
        error = new ErrorResponse(message, 401);
    }

    // Send response
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;