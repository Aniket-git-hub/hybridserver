// src/validators/notificationValidator.ts
import Joi from 'joi';

export const updateNotificationSettingsSchema = Joi.object({
    challanAlerts: Joi.boolean(),
    registrationExpiryAlerts: Joi.boolean(),
    insuranceExpiryAlerts: Joi.boolean(),
    pucExpiryAlerts: Joi.boolean(),
    fitnessExpiryAlerts: Joi.boolean(),
    taxExpiryAlerts: Joi.boolean(),
    permitExpiryAlerts: Joi.boolean(),
    systemNotifications: Joi.boolean(),
    emailEnabled: Joi.boolean(),
    smsEnabled: Joi.boolean(),
    pushEnabled: Joi.boolean(),
    advanceReminderDays: Joi.string()
});