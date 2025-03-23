// src/models/schemas/vehicles.ts
import { createId } from '@paralleldrive/cuid2';
import {
    boolean,
    date,
    int,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { VehicleStatus } from '../types/enums';
import { companies } from './companies';

export const vehicles = mysqlTable('vehicles', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    companyId: varchar('company_id', { length: 128 })
        .notNull()
        .references(() => companies.id, { onDelete: 'cascade' }),

    // Basic vehicle identification
    registrationNumber: varchar('registration_number', { length: 50 }).unique().notNull(),
    chassisNumber: varchar('chassis_number', { length: 100 }),
    engineNumber: varchar('engine_number', { length: 100 }),

    // Vehicle details
    vehicleClass: varchar('vehicle_class', { length: 100 }),
    vehicleCategory: varchar('vehicle_category', { length: 100 }),
    maker: varchar('maker', { length: 100 }),
    model: varchar('model', { length: 100 }),
    manufacturedDate: date('manufactured_date'),
    fuelType: varchar('fuel_type', { length: 50 }),
    fuelNorms: varchar('fuel_norms', { length: 50 }),
    vehicleColor: varchar('vehicle_color', { length: 50 }),
    bodyType: varchar('body_type', { length: 100 }),

    // Technical specifications
    unladenWeight: int('unladen_weight'),
    grossWeight: int('gross_weight'),
    numberOfCylinders: int('number_of_cylinders'),
    cubicCapacity: int('cubic_capacity'),
    seatingCapacity: int('seating_capacity'),
    standingCapacity: int('standing_capacity'),
    sleeperCapacity: int('sleeper_capacity'),
    wheelBase: int('wheel_base'),

    // Status tracking
    lastApiSync: timestamp('last_api_sync'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
    status: varchar('status', { length: 20 })
        .default(VehicleStatus.ACTIVE)
        .notNull(),
});

export const vehicleOwners = mysqlTable('vehicle_owners', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    vehicleId: varchar('vehicle_id', { length: 128 })
        .notNull()
        .references(() => vehicles.id, { onDelete: 'cascade' }),
    ownerName: varchar('owner_name', { length: 255 }).notNull(),
    fatherName: varchar('father_name', { length: 255 }),
    permanentAddress: varchar('permanent_address', { length: 500 }),
    presentAddress: varchar('present_address', { length: 500 }),
    mobileNumber: varchar('mobile_number', { length: 20 }),
    ownerSerialNumber: int('owner_serial_number'),
    isCurrent: boolean('is_current').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});