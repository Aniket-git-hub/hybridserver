// src/controllers/adminController.ts
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { companies } from '../models/schemas/companies';
import { auditLogs } from '../models/schemas/logs';
import { companySubscriptions, subscriptionPlans } from '../models/schemas/subscriptions';
import { users } from '../models/schemas/users';
import { PaymentStatus, SubscriptionStatus, UserRole } from '../models/types/enums';
import ErrorResponse from '../utils/errorResponse';

/**
 * @desc    Get all companies
 * @route   GET /api/admin/companies
 * @access  Private/SuperAdmin
 */
export const getAllCompanies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const allCompanies = await db.query.companies.findMany({
        with: {
            users: {
                where: eq(users.role, UserRole.ADMIN),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    lastLogin: true
                }
            },
            companySubscriptions: {
                where: eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),
                with: {
                    plan: true
                }
            }
        }
    });

    res.status(200).json({
        success: true,
        count: allCompanies.length,
        data: allCompanies
    });
});

/**
 * @desc    Get company details
 * @route   GET /api/admin/companies/:id
 * @access  Private/SuperAdmin
 */
export const getCompanyDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.params.id;

    const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        with: {
            users: true,
            companySubscriptions: {
                with: {
                    plan: true
                }
            }
        }
    });

    if (!company) {
        return next(new ErrorResponse('Company not found', 404));
    }

    res.status(200).json({
        success: true,
        data: company
    });
});

/**
 * @desc    Update company status
 * @route   PUT /api/admin/companies/:id/status
 * @access  Private/SuperAdmin
 */
export const updateCompanyStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.params.id;
    const { status } = req.body;

    // Find company
    const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
    });

    if (!company) {
        return next(new ErrorResponse('Company not found', 404));
    }

    // Update company status
    await db.transaction(async (tx) => {
        await tx.update(companies)
            .set({ status, updatedAt: new Date() })
            .where(eq(companies.id, companyId));

        // Log audit
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId: null, // Super admin action doesn't belong to a company
            userId: req.user.id,
            action: 'UPDATE_STATUS',
            entityType: 'COMPANY',
            entityId: companyId,
            oldValues: { status: company.status },
            newValues: { status },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
    });

    res.status(200).json({
        success: true,
        data: { id: companyId, status }
    });
});

/**
 * @desc    Create subscription plan
 * @route   POST /api/admin/subscription-plans
 * @access  Private/SuperAdmin
 */
export const createSubscriptionPlan = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
        name,
        description,
        priceMonthly,
        priceYearly,
        maxVehicles,
        maxUsers,
        features,
        isCustom = false
    } = req.body;

    const planId = createId();

    await db.insert(subscriptionPlans).values({
        id: planId,
        name,
        description,
        priceMonthly,
        priceYearly,
        maxVehicles,
        maxUsers,
        features,
        isCustom
    });

    const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
    });

    res.status(201).json({
        success: true,
        data: plan
    });
});

/**
 * @desc    Update subscription plan
 * @route   PUT /api/admin/subscription-plans/:id
 * @access  Private/SuperAdmin
 */
export const updateSubscriptionPlan = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const planId = req.params.id;

    const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
    });

    if (!plan) {
        return next(new ErrorResponse('Subscription plan not found', 404));
    }

    await db.update(subscriptionPlans)
        .set({
            ...req.body,
            updatedAt: new Date()
        })
        .where(eq(subscriptionPlans.id, planId));

    const updatedPlan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
    });

    res.status(200).json({
        success: true,
        data: updatedPlan
    });
});

/**
 * @desc    Set subscription plan status (active/inactive)
 * @route   PUT /api/admin/subscription-plans/:id/status
 * @access  Private/SuperAdmin
 */
export const updatePlanStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const planId = req.params.id;
    const { isActive } = req.body;

    const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
    });

    if (!plan) {
        return next(new ErrorResponse('Subscription plan not found', 404));
    }

    await db.update(subscriptionPlans)
        .set({
            isActive,
            updatedAt: new Date()
        })
        .where(eq(subscriptionPlans.id, planId));

    res.status(200).json({
        success: true,
        data: { id: planId, isActive }
    });
});

/**
 * @desc    Create manual subscription for a company
 * @route   POST /api/admin/companies/:id/subscriptions
 * @access  Private/SuperAdmin
 */
export const createManualSubscription = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.params.id;
    const {
        planId,
        startDate,
        endDate,
        amountPaid,
        paymentStatus = PaymentStatus.PAID,
        notes
    } = req.body;

    // Check if company exists
    const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
    });

    if (!company) {
        return next(new ErrorResponse('Company not found', 404));
    }

    // Check if plan exists
    const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
    });

    if (!plan) {
        return next(new ErrorResponse('Subscription plan not found', 404));
    }

    const subscriptionId = createId();
    const invoiceNumber = `INV-M-${Date.now().toString().slice(-6)}`;

    await db.transaction(async (tx) => {
        // Create subscription
        await tx.insert(companySubscriptions).values({
            id: subscriptionId,
            companyId,
            planId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            paymentStatus,
            amountPaid,
            paymentMethod: 'manual',
            invoiceId: invoiceNumber,
            renewalStatus: 'MANUAL',
            status: SubscriptionStatus.ACTIVE
        });

        // Log audit
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId: null, // Super admin action
            userId: req.user.id,
            action: 'CREATE_MANUAL_SUBSCRIPTION',
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId,
            newValues: {
                companyId,
                planId,
                startDate,
                endDate,
                amountPaid,
                notes
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
    });

    const subscription = await db.query.companySubscriptions.findFirst({
        where: eq(companySubscriptions.id, subscriptionId),
        with: {
            plan: true,
            company: true
        }
    });

    res.status(201).json({
        success: true,
        data: subscription
    });
});