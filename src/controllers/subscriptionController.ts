// src/controllers/subscriptionController.ts
import { and, eq, gte } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { companySubscriptions, subscriptionPlans } from '../models/schemas/subscriptions';
import { createSubscriptionOrder, processPaymentFailure, processSubscriptionPayment } from '../services/paymentService';
import ErrorResponse from '../utils/errorResponse';

/**
 * @desc    Get all subscription plans
 * @route   GET /api/subscriptions/plans
 * @access  Public
 */
export const getSubscriptionPlans = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const plans = await db.query.subscriptionPlans.findMany({
        where: eq(subscriptionPlans.isActive, true)
    });

    res.status(200).json({
        success: true,
        data: plans
    });
});

/**
 * @desc    Get company subscription
 * @route   GET /api/subscriptions/current
 * @access  Private
 */
export const getCurrentSubscription = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;
    const now = new Date();

    const subscription = await db.query.companySubscriptions.findFirst({
        where: and(
            eq(companySubscriptions.companyId, companyId),
            gte(companySubscriptions.endDate, now)
        ),
        with: {
            plan: true
        },
        orderBy: (companySubscriptions, { desc }) => [desc(companySubscriptions.endDate)]
    });

    if (!subscription) {
        return res.status(200).json({
            success: true,
            data: null,
            message: 'No active subscription found'
        });
    }

    res.status(200).json({
        success: true,
        data: subscription
    });
});

/**
 * @desc    Create payment order for subscription
 * @route   POST /api/subscriptions/create-order
 * @access  Private
 */
export const createPaymentOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { planId, isYearly = false } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    // Get plan details
    const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
    });

    if (!plan) {
        return next(new ErrorResponse('Subscription plan not found', 404));
    }

    // Calculate amount based on billing period
    const amount = isYearly ? plan.priceYearly : plan.priceMonthly;

    // Create payment order
    const order = await createSubscriptionOrder(
        companyId,
        planId,
        userId,
        amount,
        'INR',
        isYearly
    );

    res.status(200).json({
        success: true,
        data: {
            ...order,
            keyId: process.env.RAZORPAY_KEY_ID,
            planName: plan.name
        }
    });
});

/**
 * @desc    Verify payment and create subscription
 * @route   POST /api/subscriptions/verify-payment
 * @access  Private
 */
export const verifyPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { paymentId, orderId, signature } = req.body;
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const result = await processSubscriptionPayment(
        companyId,
        userId,
        paymentId,
        orderId,
        signature
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * @desc    Handle payment failure
 * @route   POST /api/subscriptions/payment-failed
 * @access  Private
 */
export const handlePaymentFailure = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { orderId, error } = req.body;

    const result = await processPaymentFailure(orderId, error);

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * @desc    Get subscription history
 * @route   GET /api/subscriptions/history
 * @access  Private
 */
export const getSubscriptionHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;

    const subscriptions = await db.query.companySubscriptions.findMany({
        where: eq(companySubscriptions.companyId, companyId),
        with: {
            plan: true
        },
        orderBy: (companySubscriptions, { desc }) => [desc(companySubscriptions.createdAt)]
    });

    res.status(200).json({
        success: true,
        count: subscriptions.length,
        data: subscriptions
    });
});