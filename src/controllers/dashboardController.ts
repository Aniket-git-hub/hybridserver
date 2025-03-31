// src/controllers/dashboardController.ts
import { and, count, eq, gt, lt, sql } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { challans } from '../models/schemas/challans';
import { vehicleCompliance } from '../models/schemas/compliance';
import { vehicles } from '../models/schemas/vehicles';

/**
 * @desc    Get dashboard metrics
 * @route   GET /api/dashboard/metrics
 * @access  Private
 */
export const getDashboardMetrics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;
    const now = new Date();

    // Get 30 days from now for expiring compliance
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get vehicle count
    const vehicleCount = await db
        .select({ count: count() })
        .from(vehicles)
        .where(eq(vehicles.companyId, companyId));

    // Get unpaid challans count and amount
    const unpaidChallans = await db
        .select({
            count: count(),
            totalAmount: sql<number>`sum(${challans.challanAmount})`
        })
        .from(challans)
        .innerJoin(
            vehicles,
            eq(vehicles.id, challans.vehicleId)
        )
        .where(
            and(
                eq(vehicles.companyId, companyId),
                eq(challans.challanStatus, 'Unpaid')
            )
        );

    // Get expiring compliance count
    const expiringCompliance = await db
        .select({
            registrationExpiring: count(
                and(
                    gt(vehicleCompliance.registrationValidUntil, now),
                    lt(vehicleCompliance.registrationValidUntil, thirtyDaysFromNow)
                )
            ),
            fitnessExpiring: count(
                and(
                    gt(vehicleCompliance.fitnessValidUntil, now),
                    lt(vehicleCompliance.fitnessValidUntil, thirtyDaysFromNow)
                )
            ),
            insuranceExpiring: count(
                and(
                    gt(vehicleCompliance.insuranceValidUntil, now),
                    lt(vehicleCompliance.insuranceValidUntil, thirtyDaysFromNow)
                )
            ),
            pucExpiring: count(
                and(
                    gt(vehicleCompliance.pucValidUntil, now),
                    lt(vehicleCompliance.pucValidUntil, thirtyDaysFromNow)
                )
            ),
            permitExpiring: count(
                and(
                    gt(vehicleCompliance.permitValidUntil, now),
                    lt(vehicleCompliance.permitValidUntil, thirtyDaysFromNow)
                )
            )
        })
        .from(vehicleCompliance)
        .innerJoin(
            vehicles,
            eq(vehicles.id, vehicleCompliance.vehicleId)
        )
        .where(eq(vehicles.companyId, companyId));

    // Total expiring documents
    const totalExpiring = (
        (expiringCompliance[0]?.registrationExpiring || 0) +
        (expiringCompliance[0]?.fitnessExpiring || 0) +
        (expiringCompliance[0]?.insuranceExpiring || 0) +
        (expiringCompliance[0]?.pucExpiring || 0) +
        (expiringCompliance[0]?.permitExpiring || 0)
    );

    // Get compliance alerts
    const expiringVehicles = await db.query.vehicles.findMany({
        where: eq(vehicles.companyId, companyId),
        with: {
            compliance: {
                where: sql`
                    (${vehicleCompliance.registrationValidUntil} > ${now} AND ${vehicleCompliance.registrationValidUntil} < ${thirtyDaysFromNow}) OR
                    (${vehicleCompliance.fitnessValidUntil} > ${now} AND ${vehicleCompliance.fitnessValidUntil} < ${thirtyDaysFromNow}) OR
                    (${vehicleCompliance.insuranceValidUntil} > ${now} AND ${vehicleCompliance.insuranceValidUntil} < ${thirtyDaysFromNow}) OR
                    (${vehicleCompliance.pucValidUntil} > ${now} AND ${vehicleCompliance.pucValidUntil} < ${thirtyDaysFromNow}) OR
                    (${vehicleCompliance.permitValidUntil} > ${now} AND ${vehicleCompliance.permitValidUntil} < ${thirtyDaysFromNow})
                `
            }
        },
        limit: 5
    });

    // Get recent challans
    const recentChallans = await db.query.challans.findMany({
        with: {
            vehicle: true,
            offences: true
        },
        orderBy: (challans, { desc }) => [desc(challans.challanDate)],
        limit: 5
    });

    // Filter to only show challans for vehicles in the company
    const filteredRecentChallans = recentChallans.filter(
        challan => challan.vehicle?.companyId === companyId
    );

    res.status(200).json({
        success: true,
        data: {
            vehicleCount: vehicleCount[0]?.count || 0,
            unpaidChallans: {
                count: unpaidChallans[0]?.count || 0,
                totalAmount: unpaidChallans[0]?.totalAmount || 0
            },
            expiringCompliance: {
                ...expiringCompliance[0],
                total: totalExpiring
            },
            alerts: {
                expiringVehicles,
                recentChallans: filteredRecentChallans
            }
        }
    });
});

/**
 * @desc    Get challan analytics
 * @route   GET /api/dashboard/challan-analytics
 * @access  Private
 */
export const getChallanAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;

    // Get monthly challan trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get challans by month
    const challansByMonth = await db
        .select({
            month: sql<string>`DATE_FORMAT(${challans.challanDate}, '%Y-%m')`,
            count: count(),
            totalAmount: sql<number>`sum(${challans.challanAmount})`
        })
        .from(challans)
        .innerJoin(
            vehicles,
            eq(vehicles.id, challans.vehicleId)
        )
        .where(
            and(
                eq(vehicles.companyId, companyId),
                gt(challans.challanDate, sixMonthsAgo)
            )
        )
        .groupBy(sql`DATE_FORMAT(${challans.challanDate}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${challans.challanDate}, '%Y-%m')`);

    // Get challans by status
    const challansByStatus = await db
        .select({
            status: challans.challanStatus,
            count: count(),
            totalAmount: sql<number>`sum(${challans.challanAmount})`
        })
        .from(challans)
        .innerJoin(
            vehicles,
            eq(vehicles.id, challans.vehicleId)
        )
        .where(eq(vehicles.companyId, companyId))
        .groupBy(challans.challanStatus);

    // Get top vehicles with most challans
    const topVehiclesByChallans = await db
        .select({
            vehicleId: vehicles.id,
            registrationNumber: vehicles.registrationNumber,
            count: count(),
            totalAmount: sql<number>`sum(${challans.challanAmount})`
        })
        .from(challans)
        .innerJoin(
            vehicles,
            eq(vehicles.id, challans.vehicleId)
        )
        .where(eq(vehicles.companyId, companyId))
        .groupBy(vehicles.id, vehicles.registrationNumber)
        .orderBy(sql`count() DESC`)
        .limit(5);

    res.status(200).json({
        success: true,
        data: {
            challansByMonth,
            challansByStatus,
            topVehiclesByChallans
        }
    });
});

/**
 * @desc    Get compliance analytics
 * @route   GET /api/dashboard/compliance-analytics
 * @access  Private
 */
export const getComplianceAnalytics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;
    const now = new Date();

    // Get compliance status overview
    const complianceOverview = await db
        .select({
            // Expired
            registrationExpired: count(lt(vehicleCompliance.registrationValidUntil, now)),
            fitnessExpired: count(lt(vehicleCompliance.fitnessValidUntil, now)),
            insuranceExpired: count(lt(vehicleCompliance.insuranceValidUntil, now)),
            pucExpired: count(lt(vehicleCompliance.pucValidUntil, now)),
            permitExpired: count(lt(vehicleCompliance.permitValidUntil, now)),

            // Valid
            registrationValid: count(gt(vehicleCompliance.registrationValidUntil, now)),
            fitnessValid: count(gt(vehicleCompliance.fitnessValidUntil, now)),
            insuranceValid: count(gt(vehicleCompliance.insuranceValidUntil, now)),
            pucValid: count(gt(vehicleCompliance.pucValidUntil, now)),
            permitValid: count(gt(vehicleCompliance.permitValidUntil, now)),

            // Total records
            totalVehicles: count()
        })
        .from(vehicleCompliance)
        .innerJoin(
            vehicles,
            eq(vehicles.id, vehicleCompliance.vehicleId)
        )
        .where(eq(vehicles.companyId, companyId));

    // Get vehicles with expired documents
    const expiredVehicles = await db.query.vehicles.findMany({
        where: eq(vehicles.companyId, companyId),
        with: {
            compliance: {
                where: sql`
                    ${vehicleCompliance.registrationValidUntil} < ${now} OR
                    ${vehicleCompliance.fitnessValidUntil} < ${now} OR
                    ${vehicleCompliance.insuranceValidUntil} < ${now} OR
                    ${vehicleCompliance.pucValidUntil} < ${now} OR
                    ${vehicleCompliance.permitValidUntil} < ${now}
                `
            }
        },
        limit: 10
    });

    res.status(200).json({
        success: true,
        data: {
            complianceOverview: complianceOverview[0],
            expiredVehicles: expiredVehicles.filter(v => v.compliance !== null)
        }
    });
});