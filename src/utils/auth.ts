// src/utils/auth.ts
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';

/**
 * Generate JWT token
 * @param id - User ID
 */
export const generateToken = (id: string): string => {
    const secret: Secret = process.env.JWT_SECRET as Secret;
    const options: SignOptions = {
        expiresIn: (process.env.JWT_EXPIRE || '30d') as jwt.SignOptions['expiresIn']
    };

    return jwt.sign({ id }, secret, options);
};

/**
 * Send token response with cookie
 * @param user - User object
 * @param statusCode - HTTP status code
 * @param res - Express response
 */
export const sendTokenResponse = (user: any, statusCode: number, res: Response): void => {
    // Create token
    const token = generateToken(user.id);

    // Remove sensitive data
    const userResponse = { ...user };
    delete userResponse.passwordHash;

    const cookieOptions = {
        expires: new Date(
            Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE as string) || 30) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    res
        .status(statusCode)
        .cookie('token', token, cookieOptions)
        .json({
            success: true,
            token,
            data: userResponse
        });
};

/**
 * Hash password
 * @param password - Plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

/**
 * Compare password
 * @param enteredPassword - Plain text password
 * @param hashedPassword - Hashed password
 */
export const comparePassword = async (
    enteredPassword: string,
    hashedPassword: string
): Promise<boolean> => {
    return bcrypt.compare(enteredPassword, hashedPassword);
};