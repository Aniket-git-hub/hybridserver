// src/controllers/notificationController.ts
import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { notifications, userNotificationSettings } from '../models/schemas/notifications';
import { DeliveryStatus, NotificationSeverity } from '../models/types/enums';
import ErrorResponse from '../utils/errorResponse';

/**
 * @desc    Get all notifications for a user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getUserNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startIndex = (page - 1) * limit;

    // Get user notifications
    const userNotifications = await db.query.notifications.findMany({
        where: and(
            eq(notifications.companyId, companyId),
            eq(notifications.userId, userId)
        ),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
        limit,
        offset: startIndex
    });

    // Get total count for pagination
    const totalCount = await db.query.notifications.findMany({
        where: and(
            eq(notifications.companyId, companyId),
            eq(notifications.userId, userId)
        ),
        columns: {
            id: true
        }
    });

    res.status(200).json({
        success: true,
        count: userNotifications.length,
        total: totalCount.length,
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalCount.length / limit)
        },
        data: userNotifications
    });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const notificationId = req.params.id;
    const userId = req.user.id;

    // Find notification
    const notification = await db.query.notifications.findFirst({
        where: and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
        )
    });

    if (!notification) {
        return next(new ErrorResponse('Notification not found', 404));
    }

    // Update notification
    await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

    res.status(200).json({
        success: true,
        data: { id: notificationId, isRead: true }
    });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Update all unread notifications
    await db.update(notifications)
        .set({ isRead: true })
        .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        ));

    res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
    });
});

/**
 * @desc    Get user notification settings
 * @route   GET /api/notifications/settings
 * @access  Private
 */
export const getNotificationSettings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Get or create notification settings
    let settings = await db.query.userNotificationSettings.findFirst({
        where: eq(userNotificationSettings.userId, userId)
    });

    if (!settings) {
        // Create default settings if not exists
        const settingId = createId();
        await db.insert(userNotificationSettings).values({
            id: settingId,
            userId
        });

        settings = await db.query.userNotificationSettings.findFirst({
            where: eq(userNotificationSettings.id, settingId)
        });
    }

    res.status(200).json({
        success: true,
        data: settings
    });
});

/**
 * @desc    Update notification settings
 * @route   PUT /api/notifications/settings
 * @access  Private
 */
export const updateNotificationSettings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Get or create settings
    let settings = await db.query.userNotificationSettings.findFirst({
        where: eq(userNotificationSettings.userId, userId)
    });

    const settingId = settings ? settings.id : createId();

    if (!settings) {
        // Create if not exists
        await db.insert(userNotificationSettings).values({
            id: settingId,
            userId,
            ...req.body
        });
    } else {
        // Update existing settings
        await db.update(userNotificationSettings)
            .set({
                ...req.body,
                updatedAt: new Date()
            })
            .where(eq(userNotificationSettings.id, settingId));
    }

    // Get updated settings
    const updatedSettings = await db.query.userNotificationSettings.findFirst({
        where: eq(userNotificationSettings.id, settingId)
    });

    res.status(200).json({
        success: true,
        data: updatedSettings
    });
});

/**
 * @desc    Create system notification (For internal use)
 * @access  Internal
 */
export const createNotification = async (
    companyId: string,
    userId: string | null,
    vehicleId: string | null,
    title: string,
    message: string,
    notificationType: string,
    referenceId: string | null = null,
    severity: string = NotificationSeverity.INFO
) => {
    const notificationId = createId();

    await db.insert(notifications).values({
        id: notificationId,
        companyId,
        userId,
        vehicleId,
        title,
        message,
        notificationType,
        referenceId,
        severity,
        isRead: false,
        emailStatus: DeliveryStatus.PENDING,
        smsStatus: DeliveryStatus.PENDING,
        pushStatus: DeliveryStatus.PENDING
    });

    return notificationId;
};