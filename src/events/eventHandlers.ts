import { eventEmitter } from './eventEmitter';

import { EventType, NotificationEventPayload } from './eventTypes';

const logger = require('../utils/logger');

import { db } from '../config/db';

import { auditLogs } from '../models';

import { DeliveryStatus } from '../models/types/enums';

import { sendEmail } from '../utils/emailSender';

import { sendSms } from '../utils/smsSender';

import { sendPushNotification } from '../utils/pushNotifier';

// Initialize event handlers

export function initEventHandlers() {

    // Log all events for debugging

    eventEmitter.on('*', (eventType, payload) => {

        logger.debug(`Event: ${eventType}`, { payload });

    });

    // Audit logging for major events

    setupAuditLogHandlers();

    // Notification delivery handlers

    setupNotificationHandlers();

    logger.info('Event handlers initialized');

}

// Setup audit log handlers

function setupAuditLogHandlers() {

    // Company events

    eventEmitter.on(EventType.COMPANY_CREATED, async (payload) => {

        await createAuditLog('create', 'company', payload.companyId, null, payload.data, payload.initiator);

    });

    eventEmitter.on(EventType.COMPANY_UPDATED, async (payload) => {

        await createAuditLog('update', 'company', payload.companyId, payload.oldData, payload.data, payload.initiator);

    });

    // User events

    eventEmitter.on(EventType.USER_CREATED, async (payload) => {

        await createAuditLog('create', 'user', payload.userId, null, payload.data, payload.initiator);

    });

    eventEmitter.on(EventType.USER_UPDATED, async (payload) => {

        await createAuditLog('update', 'user', payload.userId, payload.oldData, payload.data, payload.initiator);

    });

    // Vehicle events

    eventEmitter.on(EventType.VEHICLE_CREATED, async (payload) => {

        await createAuditLog('create', 'vehicle', payload.vehicleId, null, payload.data, payload.initiator);

    });

    eventEmitter.on(EventType.VEHICLE_UPDATED, async (payload) => {

        await createAuditLog('update', 'vehicle', payload.vehicleId, payload.oldData, payload.data, payload.initiator);

    });

}

// Create audit log entry

async function createAuditLog(

    action: string,

    entityType: string,

    entityId: string,

    oldValues: any,

    newValues: any,

    initiator?: string

) {

    try {

        await db.insert(auditLogs).values({

            companyId: newValues.companyId,

            userId: initiator,

            action,

            entityType,

            entityId,

            oldValues,

            newValues,

            // IP and userAgent would be added here in a real implementation

        });

    } catch (error) {

        logger.error('Failed to create audit log', { error, action, entityType, entityId });

    }

}

// Setup notification handlers

function setupNotificationHandlers() {

    // Process new notifications

    eventEmitter.on(EventType.NOTIFICATION_CREATED, async (payload: NotificationEventPayload) => {

        try {

            const notification = payload.data;



            // Skip delivery if no userId (company-wide notifications are handled differently)

            if (!notification.userId) {

                return;

            }



            // Deliver notification via appropriate channels based on settings

            // In a real implementation, you'd check user preferences here



            // Email delivery

            if (notification.emailStatus === DeliveryStatus.PENDING) {

                try {

                    // This would be implemented to send actual emails

                    await sendEmail({

                        to: 'user@example.com', // You'd get the actual email from the user record

                        subject: notification.title,

                        body: notification.message

                    });



                    // Update email status to delivered

                    await db

                        .update(notifications)

                        .set({ emailStatus: DeliveryStatus.DELIVERED })

                        .where(eq(notifications.id, notification.id));



                    logger.info(`Email notification sent: ${notification.id}`);

                } catch (error) {

                    logger.error(`Failed to send email notification: ${notification.id}`, error);



                    // Update status to failed

                    await db

                        .update(notifications)

                        .set({ emailStatus: DeliveryStatus.FAILED })

                        .where(eq(notifications.id, notification.id));

                }

            }



            // SMS delivery (similar implementation as email)

            if (notification.smsStatus === DeliveryStatus.PENDING) {

                // Implementation for SMS delivery would go here

            }



            // Push notification delivery

            if (notification.pushStatus === DeliveryStatus.PENDING) {

                // Implementation for push notification delivery would go here

            }

        } catch (error) {

            logger.error('Error processing notification', error);

        }

    });

}

// This is a placeholder - would be implemented in utils/emailSender.ts

async function sendEmail({ to, subject, body }: { to: string, subject: string, body: string }) {

    // This would be implemented with actual email sending logic

    logger.info(`[EMAIL PLACEHOLDER] To: ${to}, Subject: ${subject}`);

    return true;

}

// This is a placeholder - would be implemented in utils/smsSender.ts

async function sendSms({ to, message }: { to: string, message: string }) {

    // This would be implemented with actual SMS sending logic

    logger.info(`[SMS PLACEHOLDER] To: ${to}, Message: ${message}`);

    return true;

}

// This is a placeholder - would be implemented in utils/pushNotifier.ts

async function sendPushNotification({ userId, title, body }: { userId: string, title: string, body: string }) {

    // This would be implemented with actual push notification logic

    logger.info(`[PUSH PLACEHOLDER] UserId: ${userId}, Title: ${title}`);

    return true;

}

// Helper for drizzle import

import { eq } from 'drizzle-orm';

import { notifications } from '../models';
