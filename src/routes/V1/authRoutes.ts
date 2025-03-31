// src/routes/authRoutes.ts

import express from 'express';
import {
    acceptInvitation,
    forgotPassword,
    getMe,
    inviteUser,
    login,
    logout,
    registerCompany,
    resetPassword,
    sendVerificationEmailToken,
    updatePassword,
    updateProfile,
    verifyEmail
} from '../../controllers/authController';
import { authorize, protect } from '../../middlewares/authMiddleware';
import validateRequest from '../../middlewares/validate';
import {
    acceptInvitationSchema,
    companyRegistrationSchema,
    forgotPasswordSchema,
    inviteUserSchema,
    loginSchema,
    resetPasswordSchema,
    updatePasswordSchema,
    updateProfileSchema
} from '../../validators/authValidator';

const router = express.Router();

// Public routes
router.post('/register-company', validateRequest(companyRegistrationSchema), registerCompany);
router.post('/login', validateRequest(loginSchema), login);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validateRequest(resetPasswordSchema), resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/accept-invitation/:token', validateRequest(acceptInvitationSchema), acceptInvitation);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.get('/logout', logout);
router.post('/send-verification-email', sendVerificationEmailToken);
router.put('/update-profile', validateRequest(updateProfileSchema), updateProfile);
router.put('/update-password', validateRequest(updatePasswordSchema), updatePassword);

// Admin only routes
router.post('/invite', authorize('ADMIN'), validateRequest(inviteUserSchema), inviteUser);

export default router;