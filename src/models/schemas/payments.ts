// src/models/schemas/payments.ts
import { createId } from '@paralleldrive/cuid2';
import {
    decimal, json,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { TransactionStatus } from '../types/enums';
import { companies } from './companies';
import { companySubscriptions } from './subscriptions';

export const paymentTransactions = mysqlTable('payment_transactions', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    subscriptionId: varchar('subscription_id', { length: 128 })
        .references(() => companySubscriptions.id, { onDelete: 'set null' }),

    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    transactionId: varchar('transaction_id', { length: 100 }),
    referenceNumber: varchar('reference_number', { length: 100 }),

    status: varchar('status', { length: 20 })
        .default(TransactionStatus.INITIATED)
        .notNull(),
    paymentGateway: varchar('payment_gateway', { length: 50 }),
    gatewayResponse: json('gateway_response'),
    failureReason: varchar('failure_reason', { length: 255 }),

    invoiceNumber: varchar('invoice_number', { length: 100 }),
    receiptUrl: varchar('receipt_url', { length: 255 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});