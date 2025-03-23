// src/models/schemas/notifications.ts
import { createId } from '@paralleldrive/cuid2';
import {
    boolean,
    mysqlTable,
    text,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import {
    DeliveryStatus,
    NotificationSeverity
} from '../types/enums';
import { companies } from './companies';
import { users } from './users';
import { vehicles } from './vehicles';

export const notifications = mysqlTable('notifications', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 128 })
        .references(() => users.id, { onDelete: 'set null' }),
    vehicleId: varchar('vehicle_id', { length: 128 })
        .references(() => vehicles.id, { onDelete: 'set null' }),

    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),

    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    referenceId: varchar('reference_id', { length: 128 }),
    severity: varchar('severity', { length: 20 })
        .default(NotificationSeverity.INFO)
        .notNull(),

    // Delivery status tracking
    isRead: boolean('is_read').default(false),
    emailStatus: varchar('email_status', { length: 20 })
        .default(DeliveryStatus.PENDING)
        .notNull(),
    smsStatus: varchar('sms_status', { length: 20 })
        .default(DeliveryStatus.PENDING)
        .notNull(),
    pushStatus: varchar('push_status', { length: 20 })
        .default(DeliveryStatus.PENDING)
        .notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});

export const userNotificationSettings = mysqlTable('user_notification_settings', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 128 })
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    challanAlerts: boolean('challan_alerts').default(true),
    registrationExpiryAlerts: boolean('registration_expiry_alerts').default(true),
    insuranceExpiryAlerts: boolean('insurance_expiry_alerts').default(true),
    pucExpiryAlerts: boolean('puc_expiry_alerts').default(true),
    fitnessExpiryAlerts: boolean('fitness_expiry_alerts').default(true),
    taxExpiryAlerts: boolean('tax_expiry_alerts').default(true),
    permitExpiryAlerts: boolean('permit_expiry_alerts').default(true),
    systemNotifications: boolean('system_notifications').default(true),

    emailEnabled: boolean('email_enabled').default(true),
    smsEnabled: boolean('sms_enabled').default(true),
    pushEnabled: boolean('push_enabled').default(true),

    advanceReminderDays: varchar('advance_reminder_days', { length: 3 }).default('30'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});