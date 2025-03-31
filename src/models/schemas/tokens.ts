// src/models/schemas/tokens.ts
import { createId } from '@paralleldrive/cuid2';
import { mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const tokens = mysqlTable('tokens', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 128 })
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(), // 'email_verification', 'password_reset'
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
