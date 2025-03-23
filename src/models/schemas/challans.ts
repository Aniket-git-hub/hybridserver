// src/models/schemas/challans.ts
import { createId } from '@paralleldrive/cuid2';
import {
    boolean,
    decimal,
    json,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { vehicles } from './vehicles';

export const challans = mysqlTable('challans', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    vehicleId: varchar('vehicle_id', { length: 128 })
        .notNull()
        .references(() => vehicles.id, { onDelete: 'cascade' }),

    // From API response
    challanNumber: varchar('challan_number', { length: 100 }).unique().notNull(),
    challanDate: timestamp('challan_date').notNull(),
    challanAmount: decimal('challan_amount', { precision: 10, scale: 2 }).notNull(),
    challanStatus: varchar('challan_status', { length: 20 })
        .notNull(),
    challanPaymentDate: timestamp('challan_payment_date'),
    violatorName: varchar('violator_name', { length: 255 }),
    transactionId: varchar('transaction_id', { length: 100 }),
    paymentSource: varchar('payment_source', { length: 100 }),
    state: varchar('state', { length: 50 }),

    // URLs from API
    challanUrl: varchar('challan_url', { length: 255 }),
    receiptUrl: varchar('receipt_url', { length: 255 }),
    paymentUrl: varchar('payment_url', { length: 255 }),

    // Local tracking
    isNotified: boolean('is_notified').default(false),
    apiResponseData: json('api_response_data'),
    lastApiSync: timestamp('last_api_sync'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});

export const challanOffences = mysqlTable('challan_offences', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    challanId: varchar('challan_id', { length: 128 })
        .notNull()
        .references(() => challans.id, { onDelete: 'cascade' }),

    // From API response
    externalId: varchar('external_id', { length: 100 }),
    externalChallanId: varchar('external_challan_id', { length: 100 }),
    offenceName: varchar('offence_name', { length: 255 }).notNull(),
    mvaSection: varchar('mva_section', { length: 255 }),
    penaltyAmount: decimal('penalty_amount', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});