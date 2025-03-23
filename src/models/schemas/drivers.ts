// src/models/schemas/drivers.ts
import { createId } from '@paralleldrive/cuid2';
import {
    boolean,
    date,
    foreignKey,
    json,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { companies } from './companies';
import { vehicles } from './vehicles';

export const driverLicenses = mysqlTable('driver_licenses', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),
    licenseNumber: varchar('license_number', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    dob: date('dob'),
    gender: varchar('gender', { length: 20 }),
    bloodGroup: varchar('blood_group', { length: 10 }),
    currentStatus: varchar('current_status', { length: 50 }),
    dateOfIssue: date('date_of_issue'),
    nonTransportValidFrom: date('non_transport_valid_from'),
    nonTransportValidUntil: date('non_transport_valid_until'),
    transportValidFrom: date('transport_valid_from'),
    transportValidUntil: date('transport_valid_until'),
    hazardousValidUntil: date('hazardous_valid_until'),
    hillValidUntil: date('hill_valid_until'),
    vehicleClasses: json('vehicle_classes'), // Store array of allowed vehicle classes
    issuingAuthority: varchar('issuing_authority', { length: 255 }),
    lastApiSync: timestamp('last_api_sync'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});

export const vehicleDriverAssignments = mysqlTable('vehicle_driver_assignments', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    vehicleId: varchar('vehicle_id', { length: 128 })
        .notNull(),
    driverLicenseId: varchar('driver_license_id', { length: 128 })
        .notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    isPrimary: boolean('is_primary').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
    status: varchar('status', { length: 20 }).default('active'),
}, (table) => {
    return {
        // Custom shorter names for foreign keys
        vehicleFk: foreignKey({
            columns: [table.vehicleId],
            foreignColumns: [vehicles.id],
            name: 'vda_vehicle_fk'
        }),
        driverFk: foreignKey({
            columns: [table.driverLicenseId],
            foreignColumns: [driverLicenses.id],
            name: 'vda_driver_fk'
        })
    };
});