// src/services/schedulerService.ts
import { and, eq, gte, lt } from 'drizzle-orm';
import cron from 'node-cron';
import { db } from '../config/db';
import { createNotification } from '../controllers/notificationController';
import { vehicleCompliance } from '../models/schemas/compliance';
import { companySubscriptions } from '../models/schemas/subscriptions';
import { users } from '../models/schemas/users';
import { vehicles } from '../models/schemas/vehicles';
import { SubscriptionStatus, UserRole } from '../models/types/enums';
import { sendChallanNotificationEmail, sendComplianceExpiryEmail } from './emailService';
import { eventEmitter } from './eventService';
import { checkVehicleChallans, getVehicleRcDetails } from './externalApiService';

/**
 * Initialize all schedulers
 */
export const initializeSchedulers = () => {
    // Daily at 2 AM - Check vehicle compliance
    cron.schedule('0 2 * * *', () => {
        checkVehicleCompliance();
    });

    // Every 3 hours - Check vehicle challans
    cron.schedule('0 */3 * * *', () => {
        checkVehicleChallans();
    });

    // Every day at 1 AM - Check subscription status
    cron.schedule('0 1 * * *', () => {
        checkSubscriptions();
    });

    // Every hour - Check for RC updates
    cron.schedule('0 * * * *', () => {
        syncVehicleDetails();
    });

    console.log('Schedulers initialized');
};

/**
 * Check vehicle compliance for expiring documents
 */
const checkVehicleCompliance = async () => {
    console.log('Running compliance check scheduler');

    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // Get active subscriptions
        const activeSubscriptions = await db.query.companySubscriptions.findMany({
            where: and(
                eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),
                gte(companySubscriptions.endDate, now)
            ),
            with: {
                company: true
            }
        });

        // Process each company
        for (const subscription of activeSubscriptions) {
            const companyId = subscription.companyId;

            // Get vehicles with expiring compliance
            const expiringVehicles = await db.query.vehicles.findMany({
                where: eq(vehicles.companyId, companyId),
                with: {
                    compliance: {
                        where: and(
                            lt(vehicleCompliance.registrationValidUntil, thirtyDaysFromNow),
                            gte(vehicleCompliance.registrationValidUntil, now)
                        )
                    }
                }
            });

            // Get admin users to notify
            const adminUsers = await db.query.users.findMany({
                where: and(
                    eq(users.companyId, companyId),
                    eq(users.role, UserRole.ADMIN)
                )
            });

            // Process expiring vehicles
            for (const vehicle of expiringVehicles) {
                if (vehicle.compliance) {
                    const daysRemaining = Math.floor(
                        (vehicle.compliance.registrationValidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    // Emit compliance expiry event
                    eventEmitter.emit('compliance.expiring', {
                        companyId,
                        vehicleId: vehicle.id,
                        vehicleNumber: vehicle.registrationNumber,
                        documentType: 'Registration',
                        expiryDate: vehicle.compliance.registrationValidUntil,
                        daysRemaining
                    });

                    // Notify all admin users
                    for (const admin of adminUsers) {
                        const expiryDate = vehicle.compliance.registrationValidUntil.toLocaleDateString();

                        // Create in-app notification
                        await createNotification(
                            companyId,
                            admin.id,
                            vehicle.id,
                            `Registration expiring soon: ${vehicle.registrationNumber}`,
                            `Vehicle registration for ${vehicle.registrationNumber} will expire in ${daysRemaining} days on ${expiryDate}. Please renew it to avoid penalties.`,
                            'COMPLIANCE_EXPIRY',
                            vehicle.id,
                            'WARNING'
                        );

                        // Send email notification
                        await sendComplianceExpiryEmail(
                            admin.email,
                            admin.name,
                            vehicle.registrationNumber,
                            'Registration',
                            expiryDate,
                            daysRemaining
                        );
                    }
                }
            }
        }

        console.log('Compliance check completed');
    } catch (error) {
        console.error('Error in compliance check scheduler:', error);
    }
};

/**
 * Check vehicle challans
 */
const checkVehicleChallans = async () => {
    console.log('Running challan check scheduler');

    try {
        const now = new Date();

        // Get active subscriptions
        const activeSubscriptions = await db.query.companySubscriptions.findMany({
            where: and(
                eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),
                gte(companySubscriptions.endDate, now)
            ),
            with: {
                company: true,
                plan: true
            }
        });

        // Process each company based on subscription plan
        for (const subscription of activeSubscriptions) {
            const companyId = subscription.companyId;
            const maxChecksPerRun = subscription.plan.maxVehicles;

            // Get vehicles to check (limit based on plan)
            const vehiclesToCheck = await db.query.vehicles.findMany({
                where: eq(vehicles.companyId, companyId),
                orderBy: (vehicles, { asc }) => [asc(vehicles.lastApiSync)],
                limit: maxChecksPerRun
            });

            // Get admin users to notify
            const adminUsers = await db.query.users.findMany({
                where: and(
                    eq(users.companyId, companyId),
                    eq(users.role, UserRole.ADMIN)
                )
            });

            // Check challans for each vehicle
            for (const vehicle of vehiclesToCheck) {
                try {
                    // Call external API
                    const challanData = await checkVehicleChallans(companyId, vehicle.registrationNumber);

                    // Update vehicle last API sync
                    await db.update(vehicles)
                        .set({ lastApiSync: now })
                        .where(eq(vehicles.id, vehicle.id));

                    // Process challans
                    if (challanData.data && challanData.data.length > 0) {
                        for (const challanItem of challanData.data) {
                            // Skip if challan already exists or is paid
                            const existingChallan = await db.query.challans.findFirst({
                                where: eq(challans.challanNumber, challanItem.challanNo)
                            });

                            if (existingChallan || challanItem.challanStatus === 'Paid') {
                                continue;
                            }

                            // Create new challan
                            const challanId = createId();

                            await db.insert(challans).values({
                                id: challanId,
                                vehicleId: vehicle.id,
                                challanNumber: challanItem.challanNo,
                                challanDate: new Date(challanItem.challanDate),
                                challanAmount: parseFloat(challanItem.amount),
                                challanStatus: challanItem.challanStatus,
                                challanPaymentDate: challanItem.challanStatus === 'Paid' ? new Date() : null,
                                violatorName: challanItem.accusedName,
                                paymentSource: '',
                                state: challanItem.state,
                                challanUrl: '',
                                receiptUrl: '',
                                paymentUrl: challanItem.paymentUrl,
                                isNotified: false,
                                apiResponseData: challanItem,
                                lastApiSync: now
                            });

                            // Create challan offense
                            await db.insert(challanOffences).values({
                                id: createId(),
                                challanId,
                                externalId: '',
                                externalChallanId: challanItem.challanNo,
                                offenceName: challanItem.offenseDetails,
                                mvaSection: '',
                                penaltyAmount: parseFloat(challanItem.amount)
                            });

                            // Emit challan detected event
                            eventEmitter.emit('challan.detected', {
                                companyId,
                                vehicleId: vehicle.id,
                                vehicleNumber: vehicle.registrationNumber,
                                challanId,
                                challanNumber: challanItem.challanNo,
                                challanDate: challanItem.challanDate,
                                challanAmount: challanItem.amount,
                                offenceDetails: challanItem.offenseDetails
                            });

                            // Notify all admin users
                            for (const admin of adminUsers) {
                                // Create in-app notification
                                await createNotification(
                                    companyId,
                                    admin.id,
                                    vehicle.id,
                                    `New Challan Detected: ${vehicle.registrationNumber}`,
                                    `A new challan (${challanItem.challanNo}) has been detected for vehicle ${vehicle.registrationNumber}. Amount: ₹${challanItem.amount}. Offence: ${challanItem.offenseDetails.substring(0, 100)}...`,
                                    'CHALLAN_DETECTED',
                                    challanId,
                                    'HIGH'
                                );

                                // Send email notification
                                await sendChallanNotificationEmail(
                                    admin.email,
                                    admin.name,
                                    vehicle.registrationNumber,
                                    challanItem.challanNo,
                                    new Date(challanItem.challanDate).toLocaleDateString(),
                                    parseFloat(challanItem.amount),
                                    challanItem.offenseDetails
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error checking challans for vehicle ${vehicle.registrationNumber}:`, error);
                }
            }
        }

        console.log('Challan check completed');
    } catch (error) {
        console.error('Error in challan check scheduler:', error);
    }
};

/**
 * Check subscription status
 */
const checkSubscriptions = async () => {
    console.log('Running subscription check scheduler');

    try {
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Find expiring subscriptions (within next 3 days)
        const expiringSubscriptions = await db.query.companySubscriptions.findMany({
            where: and(
                eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),
                lt(companySubscriptions.endDate, threeDaysFromNow),
                gte(companySubscriptions.endDate, now)
            ),
            with: {
                company: true,
                plan: true
            }
        });

        // Notify companies about expiring subscriptions
        for (const subscription of expiringSubscriptions) {
            const companyId = subscription.companyId;

            // Get admin users to notify
            const adminUsers = await db.query.users.findMany({
                where: and(
                    eq(users.companyId, companyId),
                    eq(users.role, UserRole.ADMIN)
                )
            });

            const daysRemaining = Math.floor(
                (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Emit subscription expiring event
            eventEmitter.emit('subscription.expiring', {
                companyId,
                subscriptionId: subscription.id,
                planId: subscription.planId,
                planName: subscription.plan.name,
                expiryDate: subscription.endDate,
                daysRemaining
            });

            // Notify all admin users
            for (const admin of adminUsers) {
                // Create in-app notification
                await createNotification(
                    companyId,
                    admin.id,
                    null,
                    `Subscription Expiring Soon`,
                    `Your ${subscription.plan.name} subscription will expire in ${daysRemaining} days on ${subscription.endDate.toLocaleDateString()}. Please renew to avoid service interruption.`,
                    'SUBSCRIPTION_EXPIRY',
                    subscription.id,
                    'HIGH'
                );
            }
        }

        // Find expired subscriptions
        const expiredSubscriptions = await db.query.companySubscriptions.findMany({
            where: and(
                eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),
                lt(companySubscriptions.endDate, now)
            )
        });

        // Update expired subscriptions
        for (const subscription of expiredSubscriptions) {
            await db.update(companySubscriptions)
                .set({
                    status: SubscriptionStatus.EXPIRED,
                    updatedAt: now
                })
                .where(eq(companySubscriptions.id, subscription.id));

            // Emit subscription expired event
            eventEmitter.emit('subscription.expired', {
                companyId: subscription.companyId,
                subscriptionId: subscription.id
            });
        }

        console.log('Subscription check completed');
    } catch (error) {
        console.error('Error in subscription check scheduler:', error);
    }
};

/**
 * Sync vehicle RC details from external API
 */
const syncVehicleDetails = async () => {
    console.log('Running vehicle details sync scheduler');

    try {
        const now = new Date();
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);

        // Get active subscriptions
        const activeSubscriptions = await db.query.companySubscriptions.findMany({
            where: and(
                eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),
                gte(companySubscriptions.endDate, now)
            ),
            with: {
                plan: true
            }
        });

        // Process each company based on subscription plan
        for (const subscription of activeSubscriptions) {
            const companyId = subscription.companyId;
            const maxChecksPerRun = Math.ceil(subscription.plan.maxVehicles / 24); // Distribute over 24 hours

            // Get vehicles to check (limit based on plan)
            const vehiclesToSync = await db.query.vehicles.findMany({
                where: and(
                    eq(vehicles.companyId, companyId),
                    lt(vehicles.lastApiSync, dayAgo)
                ),
                orderBy: (vehicles, { asc }) => [asc(vehicles.lastApiSync)],
                limit: maxChecksPerRun
            });

            // Sync details for each vehicle
            for (const vehicle of vehiclesToSync) {
                try {
                    // Call external API
                    const rcData = await getVehicleRcDetails(companyId, vehicle.registrationNumber);

                    if (rcData.success && rcData.data) {
                        // Update vehicle details and compliance
                        // This would use similar logic to the fetchVehicleRcDetails controller function
                        // but simplified for background processing
                        await updateVehicleFromRcData(vehicle.id, rcData.data);
                    }

                    // Update vehicle last API sync regardless of success
                    await db.update(vehicles)
                        .set({ lastApiSync: now })
                        .where(eq(vehicles.id, vehicle.id));

                } catch (error) {
                    console.error(`Error syncing details for vehicle ${vehicle.registrationNumber}:`, error);
                }
            }
        }

        console.log('Vehicle details sync completed');
    } catch (error) {
        console.error('Error in vehicle details sync scheduler:', error);
    }
};

/**
 * Helper function to update vehicle from RC data
 */
const updateVehicleFromRcData = async (vehicleId: string, data: any) => {
    const vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId),
        with: {
            compliance: true,
            owners: true
        }
    });

    if (!vehicle) return;

    await db.transaction(async (tx) => {
        // Update vehicle details (simplified logic)
        await tx.update(vehicles)
            .set({
                chassisNumber: data.chassis_number || vehicle.chassisNumber,
                engineNumber: data.engine_number || vehicle.engineNumber,
                // ... other fields as needed
                lastApiSync: new Date()
            })
            .where(eq(vehicles.id, vehicleId));

        // Update compliance data
        await tx.update(vehicleCompliance)
            .set({
                registrationValidUntil: data.registration_valid_until ? new Date(data.registration_valid_until) : vehicle.compliance.registrationValidUntil,
                fitnessValidUntil: data.fitness_valid_until ? new Date(data.fitness_valid_until) : vehicle.compliance.fitnessValidUntil,
                // ... other fields as needed
                lastApiSync: new Date()
            })
            .where(eq(vehicleCompliance.vehicleId, vehicleId));
    });
};