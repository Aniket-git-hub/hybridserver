// src/services/eventService.ts
import { createId } from '@paralleldrive/cuid2';
import EventEmitter from 'events';
import { db } from '../config/db';
import { auditLogs } from '../models/schemas/logs';

// Create a singleton event emitter
export const eventEmitter = new EventEmitter();

// Configure event emitter for more listeners
eventEmitter.setMaxListeners(50);

/**
 * Initialize event listeners
 */
export const initializeEventListeners = () => {
    // Log all events for debugging
    eventEmitter.on('*', async (eventName: string, data: any) => {
        console.log(`Event: ${eventName}`, data);

        // Log significant events to audit logs
        if (['challan.detected', 'compliance.expiring', 'subscription.expiring', 'subscription.expired'].includes(eventName)) {
            await db.insert(auditLogs).values({
                id: createId(),
                companyId: data.companyId || null,
                userId: data.userId || null,
                action: eventName.toUpperCase(),
                entityType: getEntityTypeFromEvent(eventName),
                entityId: getEntityIdFromEvent(eventName, data),
                newValues: data,
                ipAddress: '',
                userAgent: 'Event System'
            });
        }
    });

    // Compliance-related event handlers
    eventEmitter.on('compliance.expiring', async (data) => {
        // Additional processing beyond notifications can be done here
        // e.g., analytics tracking, slack notifications, etc.
    });

    // Challan-related event handlers
    eventEmitter.on('challan.detected', async (data) => {
        // Additional processing beyond notifications
    });

    // Subscription-related event handlers
    eventEmitter.on('subscription.expiring', async (data) => {
        // Additional processing beyond notifications
    });

    eventEmitter.on('subscription.expired', async (data) => {
        // Could trigger additional processes like disabling certain features
    });

    console.log('Event listeners initialized');
};

/**
 * Helper function to determine entity type from event name
 */
const getEntityTypeFromEvent = (eventName: string): string => {
    if (eventName.startsWith('challan')) return 'CHALLAN';
    if (eventName.startsWith('compliance')) return 'COMPLIANCE';
    if (eventName.startsWith('subscription')) return 'SUBSCRIPTION';
    if (eventName.startsWith('vehicle')) return 'VEHICLE';
    if (eventName.startsWith('user')) return 'USER';
    return 'SYSTEM';
};

/**
 * Helper function to extract entity ID from event data
 */
const getEntityIdFromEvent = (eventName: string, data: any): string => {
    if (eventName.startsWith('challan')) return data.challanId;
    if (eventName.startsWith('compliance')) return data.vehicleId;
    if (eventName.startsWith('subscription')) return data.subscriptionId;
    if (eventName.startsWith('vehicle')) return data.vehicleId;
    if (eventName.startsWith('user')) return data.userId;
    return '';
};

// Add EventEmitter.prototype.emit override to support wildcard listener
const originalEmit = EventEmitter.prototype.emit;
EventEmitter.prototype.emit = function (type: string, ...args: any[]) {
    originalEmit.apply(this, ['*', type, ...args]);
    return originalEmit.apply(this, [type, ...args]);
};