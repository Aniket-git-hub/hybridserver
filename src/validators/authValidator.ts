// src/validators/authValidator.ts
import Joi from 'joi';
import { UserRole } from '../models/types/enums';

// Company registration validation
export const companyRegistrationSchema = Joi.object({
    companyName: Joi.string().required().trim(),
    contactEmail: Joi.string().email().required().trim(),
    contactPhone: Joi.string().required().trim(),
    address: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    state: Joi.string().allow('', null),
    pincode: Joi.string().allow('', null),
    userName: Joi.string().required().trim(),
    userEmail: Joi.string().email().required().trim(),
    password: Joi.string().min(6).required()
});

// Login validation
export const loginSchema = Joi.object({
    email: Joi.string().email().required().trim(),
    password: Joi.string().required()
});

// User invitation validation
export const inviteUserSchema = Joi.object({
    email: Joi.string().email().required().trim(),
    role: Joi.string().valid(...Object.values(UserRole)).required()
});

// Accept invitation validation
export const acceptInvitationSchema = Joi.object({
    name: Joi.string().required().trim(),
    password: Joi.string().min(6).required()
});

// Update profile validation
export const updateProfileSchema = Joi.object({
    name: Joi.string().trim(),
    email: Joi.string().email().trim(),
    phone: Joi.string().allow('', null)
});

// Update password validation
export const updatePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
});


// Forgot password validation
export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().trim()
});

// Reset password validation
export const resetPasswordSchema = Joi.object({
    password: Joi.string().min(6).required()
});