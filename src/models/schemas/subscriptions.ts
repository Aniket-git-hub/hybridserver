// src/models/schemas/subscriptions.ts
import { createId } from '@paralleldrive/cuid2';
import {
    boolean,
    date,
    decimal,
    int,
    json,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { PaymentStatus, RenewalStatus, SubscriptionStatus } from '../types/enums';
import { companies } from './companies';

export const subscriptionPlans = mysqlTable('subscription_plans', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
    priceYearly: decimal('price_yearly', { precision: 10, scale: 2 }).notNull(),
    maxVehicles: int('max_vehicles').notNull(),
    maxUsers: int('max_users').notNull(),
    features: json('features'),
    isCustom: boolean('is_custom').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
    isActive: boolean('is_active').default(true),
});

export const companySubscriptions = mysqlTable('company_subscriptions', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    planId: varchar('plan_id', { length: 128 })
        .notNull()
        .references(() => subscriptionPlans.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    paymentStatus: varchar('payment_status', { length: 20 })
        .default(PaymentStatus.PENDING)
        .notNull(),
    amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 50 }),
    invoiceId: varchar('invoice_id', { length: 128 }),
    renewalStatus: varchar('renewal_status', { length: 20 })
        .default(RenewalStatus.MANUAL)
        .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
    status: varchar('status', { length: 20 })
        .default(SubscriptionStatus.ACTIVE)
        .notNull(),
});