// src/models/schemas/compliance.ts
import { createId } from '@paralleldrive/cuid2';
import {
    date,
    mysqlTable,
    timestamp,
    varchar
} from 'drizzle-orm/mysql-core';
import { vehicles } from './vehicles';

export const vehicleCompliance = mysqlTable('vehicle_compliance', {
    id: varchar('id', { length: 128 })
        .primaryKey()
        .$defaultFn(() => createId()),
    vehicleId: varchar('vehicle_id', { length: 128 })
        .notNull()
        .references(() => vehicles.id, { onDelete: 'cascade' }),

    // Registration details
    registrationDate: date('registration_date'),
    registrationValidUntil: date('registration_valid_until'),
    registrationRto: varchar('registration_rto', { length: 255 }),
    registrationState: varchar('registration_state', { length: 100 }),
    registrationStatus: varchar('registration_status', { length: 50 }),

    // Compliance dates
    fitnessValidUntil: date('fitness_valid_until'),
    taxValidUntil: date('tax_valid_until'),
    insuranceValidUntil: date('insurance_valid_until'),
    pucValidUntil: date('puc_valid_until'),

    // Insurance details
    insuranceProvider: varchar('insurance_provider', { length: 255 }),
    insurancePolicyNumber: varchar('insurance_policy_number', { length: 100 }),

    // Permit details
    permitType: varchar('permit_type', { length: 100 }),
    permitNumber: varchar('permit_number', { length: 100 }),
    permitIssueDate: date('permit_issue_date'),
    permitValidFrom: date('permit_valid_from'),
    permitValidUntil: date('permit_valid_until'),
    nationalPermitNumber: varchar('national_permit_number', { length: 100 }),
    nationalPermitValidUntil: date('national_permit_valid_until'),
    nationalPermitIssuedBy: varchar('national_permit_issued_by', { length: 255 }),

    // Other details
    financerDetails: varchar('financer_details', { length: 255 }),
    blacklistStatus: varchar('blacklist_status', { length: 100 }),
    nocDetails: varchar('noc_details', { length: 255 }),

    lastApiSync: timestamp('last_api_sync'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow(),
});