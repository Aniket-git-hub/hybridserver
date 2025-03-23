// src/models/schemas/logs.ts
import { createId } from '@paralleldrive/cuid2';
import {
    int, json,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { companies } from './companies';
import { users } from './users';

export const apiRequestLogs = mysqlTable('api_request_logs', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .references(() => companies.id, { onDelete: 'set null' }),
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    requestType: varchar('request_type', { length: 20 }).notNull(),
    parameters: json('parameters'),
    responseCode: int('response_code'),
    responseBody: json('response_body'),
    executionTimeMs: int('execution_time_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = mysqlTable('audit_logs', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .references(() => companies.id, { onDelete: 'set null' }),
    userId: varchar('user_id', { length: 128 })
        .references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    oldValues: json('old_values'),
    newValues: json('new_values'),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: varchar('user_agent', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});