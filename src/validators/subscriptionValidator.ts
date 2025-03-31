// src/validators/subscriptionValidator.ts
import Joi from 'joi';

export const createOrderSchema = Joi.object({
    planId: Joi.string().required(),
    isYearly: Joi.boolean().default(false)
});

export const verifyPaymentSchema = Joi.object({
    paymentId: Joi.string().required(),
    orderId: Joi.string().required(),
    signature: Joi.string().required()
});

export const paymentFailureSchema = Joi.object({
    orderId: Joi.string().required(),
    error: Joi.object().required()
});

// src/validators/adminValidator.ts
import { CompanyStatus, PaymentStatus } from '../models/types/enums';

export const updateCompanyStatusSchema = Joi.object({
    status: Joi.string().valid(...Object.values(CompanyStatus)).required()
});

export const createPlanSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('', null),
    priceMonthly: Joi.number().precision(2).positive().required(),
    priceYearly: Joi.number().precision(2).positive().required(),
    maxVehicles: Joi.number().integer().positive().required(),
    maxUsers: Joi.number().integer().positive().required(),
    features: Joi.array().items(Joi.string()),
    isCustom: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
});

export const updatePlanSchema = Joi.object({
    name: Joi.string(),
    description: Joi.string().allow('', null),
    priceMonthly: Joi.number().precision(2).positive(),
    priceYearly: Joi.number().precision(2).positive(),
    maxVehicles: Joi.number().integer().positive(),
    maxUsers: Joi.number().integer().positive(),
    features: Joi.array().items(Joi.string()),
    isCustom: Joi.boolean()
});

export const planStatusSchema = Joi.object({
    isActive: Joi.boolean().required()
});

export const createManualSubscriptionSchema = Joi.object({
    planId: Joi.string().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    amountPaid: Joi.number().precision(2).required(),
    paymentStatus: Joi.string().valid(...Object.values(PaymentStatus)).default(PaymentStatus.PAID),
    notes: Joi.string().allow('', null)
});