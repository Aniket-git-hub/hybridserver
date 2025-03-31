// src/controllers/companyController.ts
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { companies } from '../models/schemas/companies';
import { auditLogs } from '../models/schemas/logs';
import ErrorResponse from '../utils/errorResponse';

/**
 * @desc    Get company details
 * @route   GET /api/company
 * @access  Private
 */
export const getCompanyDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;

    const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        with: {
            users: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    profileImageUrl: true,
                    emailVerified: true,
                    phoneVerified: true,
                    lastLogin: true,
                    createdAt: true,
                    updatedAt: true,
                    status: true
                }
            },
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
 * @desc    Update company details
 * @route   PUT /api/company
 * @access  Private/Admin
 */
export const updateCompanyDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;

    // Get current company data for audit log
    const currentCompany = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
    });

    if (!currentCompany) {
        return next(new ErrorResponse('Company not found', 404));
    }

    // Update company
    await db.transaction(async (tx) => {
        await tx.update(companies)
            .set({
                name: req.body.name || currentCompany.name,
                address: req.body.address !== undefined ? req.body.address : currentCompany.address,
                city: req.body.city !== undefined ? req.body.city : currentCompany.city,
                state: req.body.state !== undefined ? req.body.state : currentCompany.state,
                pincode: req.body.pincode !== undefined ? req.body.pincode : currentCompany.pincode,
                gstNumber: req.body.gstNumber !== undefined ? req.body.gstNumber : currentCompany.gstNumber,
                contactEmail: req.body.contactEmail || currentCompany.contactEmail,
                contactPhone: req.body.contactPhone || currentCompany.contactPhone,
                logoUrl: req.body.logoUrl !== undefined ? req.body.logoUrl : currentCompany.logoUrl,
                website: req.body.website !== undefined ? req.body.website : currentCompany.website,
                businessType: req.body.businessType !== undefined ? req.body.businessType : currentCompany.businessType,
                updatedAt: new Date()
            })
            .where(eq(companies.id, companyId));

        // Log the change
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId: req.user.id,
            action: 'UPDATE',
            entityType: 'COMPANY',
            entityId: companyId,
            oldValues: currentCompany,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
    });

    // Get updated company
    const updatedCompany = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
    });

    res.status(200).json({
        success: true,
        data: updatedCompany
    });
});