// src/models/schemas/relations.ts
import { relations } from 'drizzle-orm';
import { challanOffences, challans } from './challans';
import { companies } from './companies';
import { vehicleCompliance } from './compliance';
import { driverLicenses, vehicleDriverAssignments } from './drivers';
import { apiRequestLogs, auditLogs } from './logs';
import { notifications, userNotificationSettings } from './notifications';
import { paymentTransactions } from './payments';
import { companySubscriptions, subscriptionPlans } from './subscriptions';
import { tokens } from './tokens';
import { userInvitations, users } from './users';
import { vehicleOwners, vehicles } from './vehicles';

// Company relations
export const companiesRelations = relations(companies, ({ many }) => ({
    users: many(users),
    userInvitations: many(userInvitations),
    companySubscriptions: many(companySubscriptions),
    vehicles: many(vehicles),
    notifications: many(notifications),
    paymentTransactions: many(paymentTransactions),
    apiRequestLogs: many(apiRequestLogs),
    auditLogs: many(auditLogs),
    driverLicenses: many(driverLicenses),
}));

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
    company: one(companies, {
        fields: [users.companyId],
        references: [companies.id],
    }),
    sentInvitations: many(userInvitations, { relationName: 'inviter' }),
    notificationSettings: one(userNotificationSettings),
    notifications: many(notifications),
    auditLogs: many(auditLogs),
}));

// User invitations relations
export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
    company: one(companies, {
        fields: [userInvitations.companyId],
        references: [companies.id],
    }),
    inviter: one(users, {
        fields: [userInvitations.inviterId],
        references: [users.id],
        relationName: 'inviter',
    }),
}));

// Subscription plan relations
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
    companySubscriptions: many(companySubscriptions),
}));

// Company subscriptions relations
export const companySubscriptionsRelations = relations(companySubscriptions, ({ one, many }) => ({
    company: one(companies, {
        fields: [companySubscriptions.companyId],
        references: [companies.id],
    }),
    plan: one(subscriptionPlans, {
        fields: [companySubscriptions.planId],
        references: [subscriptionPlans.id],
    }),
    paymentTransactions: many(paymentTransactions),
}));

// Vehicle relations
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
    company: one(companies, {
        fields: [vehicles.companyId],
        references: [companies.id],
    }),
    owners: many(vehicleOwners),
    compliance: one(vehicleCompliance),
    challans: many(challans),
    driverAssignments: many(vehicleDriverAssignments),
    notifications: many(notifications),
}));

// Vehicle owners relations
export const vehicleOwnersRelations = relations(vehicleOwners, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [vehicleOwners.vehicleId],
        references: [vehicles.id],
    }),
}));

// Vehicle compliance relations
export const vehicleComplianceRelations = relations(vehicleCompliance, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [vehicleCompliance.vehicleId],
        references: [vehicles.id],
    }),
}));

// Challan relations
export const challansRelations = relations(challans, ({ one, many }) => ({
    vehicle: one(vehicles, {
        fields: [challans.vehicleId],
        references: [vehicles.id],
    }),
    offences: many(challanOffences),
}));

// Challan offences relations
export const challanOffencesRelations = relations(challanOffences, ({ one }) => ({
    challan: one(challans, {
        fields: [challanOffences.challanId],
        references: [challans.id],
    }),
}));

// Driver license relations
export const driverLicensesRelations = relations(driverLicenses, ({ one, many }) => ({
    company: one(companies, {
        fields: [driverLicenses.companyId],
        references: [companies.id],
    }),
    vehicleAssignments: many(vehicleDriverAssignments),
}));

// Vehicle driver assignment relations
export const vehicleDriverAssignmentsRelations = relations(vehicleDriverAssignments, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [vehicleDriverAssignments.vehicleId],
        references: [vehicles.id],
    }),
    driver: one(driverLicenses, {
        fields: [vehicleDriverAssignments.driverLicenseId],
        references: [driverLicenses.id],
    }),
}));

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
    company: one(companies, {
        fields: [notifications.companyId],
        references: [companies.id],
    }),
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
    vehicle: one(vehicles, {
        fields: [notifications.vehicleId],
        references: [vehicles.id],
    }),
}));

// User notification settings relations
export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
    user: one(users, {
        fields: [userNotificationSettings.userId],
        references: [users.id],
    }),
}));

// Payment transaction relations
export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
    company: one(companies, {
        fields: [paymentTransactions.companyId],
        references: [companies.id],
    }),
    subscription: one(companySubscriptions, {
        fields: [paymentTransactions.subscriptionId],
        references: [companySubscriptions.id],
    }),
}));

// API request logs relations
export const apiRequestLogsRelations = relations(apiRequestLogs, ({ one }) => ({
    company: one(companies, {
        fields: [apiRequestLogs.companyId],
        references: [companies.id],
    }),
}));

// Audit logs relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    company: one(companies, {
        fields: [auditLogs.companyId],
        references: [companies.id],
    }),
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

export const tokensRelations = relations(tokens, ({ one }) => ({
    user: one(users, {
        fields: [tokens.userId],
        references: [users.id]
    })
}));