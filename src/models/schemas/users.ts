// src/models/schemas/users.ts
import { createId } from '@paralleldrive/cuid2';
import { boolean, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { InvitationStatus, UserRole, UserStatus } from '../types/enums';
import { companies } from './companies';

export const users = mysqlTable('users', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 20 }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 })
        .default(UserRole.VIEWER)
        .notNull(),
    profileImageUrl: varchar('profile_image_url', { length: 255 }),
    emailVerified: boolean('email_verified').default(false),
    phoneVerified: boolean('phone_verified').default(false),
    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
    status: varchar('status', { length: 20 })
        .default(UserStatus.PENDING)
        .notNull(),
});

export const userInvitations = mysqlTable('user_invitations', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    inviterId: varchar('inviter_id', { length: 128 })
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    invitationToken: varchar('invitation_token', { length: 255 }).unique().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    status: varchar('status', { length: 20 })
        .default(InvitationStatus.PENDING)
        .notNull(),
});