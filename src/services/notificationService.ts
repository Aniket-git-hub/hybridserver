import { and, eq } from 'drizzle-orm';

import { db } from '../config/db';

import { notifications, userNotificationSettings, users } from '../models';

import { DeliveryStatus, NotificationSeverity } from '../models/types/enums';

import { eventEmitter } from '../events/eventEmitter';

import { EventType, createEventPayload } from '../events/eventTypes';

const logger = require('../utils/logger');



export interface CreateNotificationData {

    companyId: string;

    userId?: string;

    vehicleId?: string;

    title: string;

    message: string;

    notificationType: string;

    referenceId?: string;

    severity?: NotificationSeverity;

}



export interface DeliveryChannels {

    email: boolean;

    sms: boolean;

    push: boolean;

}



class NotificationService {

    /**
  
     * Create a new notification
  
     */

    async createNotification(data: CreateNotificationData) {

        // Set default severity if not provided

        const severity = data.severity || NotificationSeverity.INFO;



        // Create notification record

        const [notification] = await db.insert(notifications).values({

            companyId: data.companyId,

            userId: data.userId,

            vehicleId: data.vehicleId,

            title: data.title,

            message: data.message,

            notificationType: data.notificationType,

            referenceId: data.referenceId,

            severity,

            isRead: false,

            emailStatus: DeliveryStatus.PENDING,

            smsStatus: DeliveryStatus.PENDING,

            pushStatus: DeliveryStatus.PENDING

        }).returning();



        // Emit notification created event

        eventEmitter.emit(

            EventType.NOTIFICATION_CREATED,

            createEventPayload({

                notificationId: notification.id,

                companyId: data.companyId,

                userId: data.userId,

                data: notification

            })

        );



        // Return the created notification

        return notification;

    }



    /**
  
     * Create notifications for all users in a company
  
     */

    async createCompanyWideNotification(

        companyId: string,

        title: string,

        message: string,

        notificationType: string,

        referenceId?: string,

        severity?: NotificationSeverity

    ) {

        // Get all active users in the company

        const companyUsers = await db

            .select()

            .from(users)

            .where(eq(users.companyId, companyId));



        // Create notifications for each user

        const notifications = [];



        for (const user of companyUsers) {

            const notification = await this.createNotification({

                companyId,

                userId: user.id,

                title,

                message,

                notificationType,

                referenceId,

                severity

            });



            notifications.push(notification);

        }



        return notifications;

    }



    /**
  
     * Get user notification settings
  
     * If not found, create default settings
  
     */

    async getUserNotificationSettings(userId: string) {

        // Try to get existing settings

        const existingSettings = await db

            .select()

            .from(userNotificationSettings)

            .where(eq(userNotificationSettings.userId, userId));



        if (existingSettings.length > 0) {

            return existingSettings[0];

        }



        // Create default settings

        const [settings] = await db.insert(userNotificationSettings).values({

            userId,

            challanAlerts: true,

            registrationExpiryAlerts: true,

            insuranceExpiryAlerts: true,

            pucExpiryAlerts: true,

            fitnessExpiryAlerts: true,

            taxExpiryAlerts: true,

            permitExpiryAlerts: true,

            systemNotifications: true,

            emailEnabled: true,

            smsEnabled: true,

            pushEnabled: true,

            advanceReminderDays: '30'

        }).returning();



        return settings;

    }



    /**
  
     * Update notification delivery status
  
     */

    async updateDeliveryStatus(

        notificationId: string,

        channel: 'email' | 'sms' | 'push',

        status: DeliveryStatus

    ) {

        const updateData =

            channel === 'email'

                ? { emailStatus: status }

                : channel === 'sms'

                    ? { smsStatus: status }

                    : { pushStatus: status };



        const [updatedNotification] = await db

            .update(notifications)

            .set(updateData)

            .where(eq(notifications.id, notificationId))

            .returning();



        if (status === DeliveryStatus.DELIVERED) {

            eventEmitter.emit(

                EventType.NOTIFICATION_DELIVERED,

                createEventPayload({

                    notificationId,

                    companyId: updatedNotification.companyId,

                    userId: updatedNotification.userId,

                    channel,

                    data: updatedNotification

                })

            );

        }



        return updatedNotification;

    }



    /**
  
     * Mark notification as read
  
     */

    async markAsRead(notificationId: string, userId: string) {

        const [notification] = await db

            .select()

            .from(notifications)

            .where(

                and(

                    eq(notifications.id, notificationId),

                    eq(notifications.userId, userId)

                )

            );



        if (!notification) {

            throw new Error('Notification not found or does not belong to user');

        }



        const [updatedNotification] = await db

            .update(notifications)

            .set({ isRead: true })

            .where(eq(notifications.id, notificationId))

            .returning();



        eventEmitter.emit(

            EventType.NOTIFICATION_READ,

            createEventPayload({

                notificationId,

                companyId: notification.companyId,

                userId,

                data: updatedNotification

            }, userId)

        );



        return updatedNotification;

    }



    /**
  
     * Get notifications for a user
  
     */

    async getUserNotifications(

        userId: string,

        limit: number = 50,

        offset: number = 0,

        readStatus?: boolean

    ) {

        let query = db

            .select()

            .from(notifications)

            .where(eq(notifications.userId, userId))

            .limit(limit)

            .offset(offset)

            .orderBy(notifications.createdAt);



        if (readStatus !== undefined) {

            query = query.where(eq(notifications.isRead, readStatus));

        }



        return await query;

    }



    /**
  
     * Check if user should receive notification based on settings
  
     */

    async shouldNotifyUser(

        userId: string,

        notificationType: string

    ): Promise<DeliveryChannels> {

        const settings = await this.getUserNotificationSettings(userId);



        // Default all channels to false

        const channels: DeliveryChannels = {

            email: false,

            sms: false,

            push: false

        };



        // Check if the specific notification type is enabled

        let notificationTypeEnabled = settings.systemNotifications;



        switch (notificationType) {

            case 'challan':

                notificationTypeEnabled = settings.challanAlerts;

                break;

            case 'registration_expiry':

                notificationTypeEnabled = settings.registrationExpiryAlerts;

                break;

            case 'insurance_expiry':

                notificationTypeEnabled = settings.insuranceExpiryAlerts;

                break;

            case 'puc_expiry':

                notificationTypeEnabled = settings.pucExpiryAlerts;

                break;

            case 'fitness_expiry':

                notificationTypeEnabled = settings.fitnessExpiryAlerts;

                break;

            case 'tax_expiry':

                notificationTypeEnabled = settings.taxExpiryAlerts;

                break;

            case 'permit_expiry':

                notificationTypeEnabled = settings.permitExpiryAlerts;

                break;

            default:

                notificationTypeEnabled = settings.systemNotifications;

        }



        // If notification type is disabled, return all channels as false

        if (!notificationTypeEnabled) {

            return channels;

        }



        // Set channels based on user preferences

        channels.email = settings.emailEnabled;

        channels.sms = settings.smsEnabled;

        channels.push = settings.pushEnabled;



        return channels;

    }

}



export const notificationService = new NotificationService();