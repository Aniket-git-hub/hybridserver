import { createId } from '@paralleldrive/cuid2';
import { mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { CompanyStatus } from '../types/enums';

export const companies = mysqlTable('companies', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    name: varchar('name', { length: 255 }).notNull(),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 20 }),
    gstNumber: varchar('gst_number', { length: 20 }),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 20 }).notNull(),
    logoUrl: varchar('logo_url', { length: 255 }),
    website: varchar('website', { length: 255 }),
    businessType: varchar('business_type', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
    status: varchar('status', { length: 20 })
        .default(CompanyStatus.ACTIVE)
        .notNull(),
});