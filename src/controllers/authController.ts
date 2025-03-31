// src/controllers/authController.ts
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { companies } from '../models/schemas/companies';
import { tokens } from '../models/schemas/tokens';
import { userInvitations, users } from '../models/schemas/users';
import { InvitationStatus, UserRole, UserStatus } from '../models/types/enums';
import {
    sendInvitationEmail,
    sendPasswordChangedEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
    sendWelcomeEmail
} from '../services/emailService';
import { comparePassword, hashPassword, sendTokenResponse } from '../utils/auth';
import ErrorResponse from '../utils/errorResponse';

/**
 * @desc    Register company and admin user
 * @route   POST /api/auth/register-company
 * @access  Public
 */
export const registerCompany = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
        companyName,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        pincode,
        userName,
        userEmail,
        password
    } = req.body;

    // Check if user email already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, userEmail)
    });

    if (existingUser) {
        return next(new ErrorResponse('Email already in use', 400));
    }

    // Create company
    const companyId = createId();
    await db.insert(companies).values({
        id: companyId,
        name: companyName,
        contactEmail,
        contactPhone,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null
    });

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user with emailVerified set to false
    const userId = createId();
    await db.insert(users).values({
        id: userId,
        companyId,
        name: userName,
        email: userEmail,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: false  // Set to false initially
    });

    // Get created user
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create verification token
    await db.insert(tokens).values({
        userId,
        token: verificationToken,
        type: 'email_verification',
        expiresAt
    });

    // Send verification email
    await sendVerificationEmail(userEmail, userName, verificationToken);

    // Send token response
    sendTokenResponse(user, 201, res);
});


/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // Check for user
    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Update last login
    await db.update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

    // Send token response
    sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        with: {
            company: true
        }
    });

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
        success: true,
        data: userWithoutPassword
    });
});

/**
 * @desc    Log user out / clear cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});

/**
 * @desc    Accept invitation
 * @route   POST /api/auth/accept-invitation/:token
 * @access  Public
 */
export const acceptInvitation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { name, password } = req.body;

    // Check if token is valid
    const invitation = await db.query.userInvitations.findFirst({
        where: eq(userInvitations.invitationToken, token)
    });

    if (!invitation) {
        return next(new ErrorResponse('Invalid invitation token', 400));
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
        return next(new ErrorResponse('Invitation has expired', 400));
    }

    // Check if invitation is pending
    if (invitation.status !== InvitationStatus.PENDING) {
        return next(new ErrorResponse('Invitation has already been used', 400));
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = createId();
    await db.insert(users).values({
        id: userId,
        companyId: invitation.companyId,
        name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        status: UserStatus.ACTIVE,
        emailVerified: true
    });

    // Update invitation status
    await db.update(userInvitations)
        .set({ status: InvitationStatus.ACCEPTED })
        .where(eq(userInvitations.id, invitation.id));

    // Get created user
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
            company: true
        }
    });

    // Send token response
    sendTokenResponse(user, 200, res);
});

/**
 * @desc    Update user details
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone } = req.body;

    // If email is changed, check if it's already in use
    if (email && email !== req.user.email) {
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (existingUser) {
            return next(new ErrorResponse('Email already in use', 400));
        }
    }

    // Update user
    await db.update(users)
        .set({
            name: name || req.user.name,
            email: email || req.user.email,
            phone: phone !== undefined ? phone : req.user.phone,
            updatedAt: new Date()
        })
        .where(eq(users.id, req.user.id));

    // Get updated user
    const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
    });

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    // Check current password
    const isMatch = await comparePassword(currentPassword, user.passwordHash);

    if (!isMatch) {
        return next(new ErrorResponse('Current password is incorrect', 401));
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, req.user.id));

    // Get updated user
    const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
    });

    // Send token response
    sendTokenResponse(updatedUser, 200, res);
});


/**
 * @desc    Send verification email
 * @route   POST /api/auth/send-verification-email
 * @access  Private
 */
export const sendVerificationEmailToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Check if user is already verified
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    if (user.emailVerified) {
        return next(new ErrorResponse('Email is already verified', 400));
    }

    // Generate token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing verification tokens for this user
    await db.delete(tokens)
        .where(
            and(
                eq(tokens.userId, userId),
                eq(tokens.type, 'email_verification')
            )
        );

    // Create new token
    await db.insert(tokens).values({
        userId,
        token: verificationToken,
        type: 'email_verification',
        expiresAt
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.name, verificationToken);

    res.status(200).json({
        success: true,
        message: 'Verification email sent'
    });
});

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    // Find token
    const verificationToken = await db.query.tokens.findFirst({
        where: and(
            eq(tokens.token, token),
            eq(tokens.type, 'email_verification')
        ),
        with: {
            user: true
        }
    });

    if (!verificationToken) {
        return next(new ErrorResponse('Invalid or expired verification token', 400));
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
        return next(new ErrorResponse('Verification token has expired', 400));
    }

    // Update user's email verification status
    await db.update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, verificationToken.userId));

    // Delete the used token
    await db.delete(tokens)
        .where(eq(tokens.id, verificationToken.id));

    // Send welcome email
    const user = verificationToken.user;
    const company = await db.query.companies.findFirst({
        where: eq(companies.id, user.companyId)
    });
    if (!company) {
        return next(new ErrorResponse('Company not found', 404));
    }
    await sendWelcomeEmail(user.email, user.name, company.name);

    res.status(200).json({
        success: true,
        message: 'Email verified successfully'
    });
});

/**
 * @desc    Forgot password - send reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    // Find user by email
    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (!user) {
        // Don't reveal that email doesn't exist for security
        return res.status(200).json({
            success: true,
            message: 'If your email is registered, a password reset link has been sent'
        });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing reset tokens for this user
    await db.delete(tokens)
        .where(
            and(
                eq(tokens.userId, user.id),
                eq(tokens.type, 'password_reset')
            )
        );

    // Create new token
    await db.insert(tokens).values({
        userId: user.id,
        token: resetToken,
        type: 'password_reset',
        expiresAt
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.status(200).json({
        success: true,
        message: 'If your email is registered, a password reset link has been sent'
    });
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = req.body;

    // Find token
    const resetToken = await db.query.tokens.findFirst({
        where: and(
            eq(tokens.token, token),
            eq(tokens.type, 'password_reset')
        ),
        with: {
            user: true
        }
    });

    if (!resetToken) {
        return next(new ErrorResponse('Invalid or expired reset token', 400));
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
        return next(new ErrorResponse('Reset token has expired', 400));
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user's password
    await db.update(users)
        .set({ passwordHash })
        .where(eq(users.id, resetToken.userId));

    // Delete the used token
    await db.delete(tokens)
        .where(eq(tokens.id, resetToken.id));

    // Send password changed confirmation
    const user = resetToken.user;
    await sendPasswordChangedEmail(user.email, user.name);

    res.status(200).json({
        success: true,
        message: 'Password reset successful'
    });
});

/**
 * Update the existing inviteUser function to send emails
 */
export const inviteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, role } = req.body;
    const companyId = req.user.companyId;
    const inviterId = req.user.id;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existingUser) {
        return next(new ErrorResponse('User with this email already exists', 400));
    }

    // Check if invitation already exists
    const existingInvitation = await db.query.userInvitations.findFirst({
        where: eq(userInvitations.email, email)
    });

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
        return next(new ErrorResponse('Invitation already sent to this email', 400));
    }

    // Generate token
    const invitationToken = crypto.randomBytes(20).toString('hex');

    // Set expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Get company and inviter details for the email
    const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
    });

    const inviter = await db.query.users.findFirst({
        where: eq(users.id, inviterId)
    });

    // Create invitation
    const invitationId = createId();
    await db.insert(userInvitations).values({
        id: invitationId,
        companyId,
        inviterId,
        email,
        role,
        invitationToken,
        expiresAt,
        status: InvitationStatus.PENDING
    });

    // Get created invitation
    const invitation = await db.query.userInvitations.findFirst({
        where: eq(userInvitations.id, invitationId),
        with: {
            company: true,
            inviter: true
        }
    });

    // Send invitation email
    await sendInvitationEmail(
        email,
        inviter?.name || 'No Inviter name',
        company?.name || 'No company name',
        role,
        invitationToken
    );

    res.status(201).json({
        success: true,
        data: invitation
    });
});