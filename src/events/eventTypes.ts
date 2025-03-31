// Define all event types as constants to ensure consistency
export enum EventType {
    // Company events
    COMPANY_CREATED = 'company.created',
    COMPANY_UPDATED = 'company.updated',  // User events
    USER_CREATED = 'user.created',
    USER_UPDATED = 'user.updated',
    USER_INVITED = 'user.invited',  // Vehicle events
    VEHICLE_CREATED = 'vehicle.created',
    VEHICLE_UPDATED = 'vehicle.updated',  // Compliance events
    COMPLIANCE_EXPIRING = 'compliance.expiring',
    COMPLIANCE_EXPIRED = 'compliance.expired',
    COMPLIANCE_UPDATED = 'compliance.updated',  // Challan events
    CHALLAN_CREATED = 'challan.created',
    CHALLAN_UPDATED = 'challan.updated',  // Notification events
    NOTIFICATION_CREATED = 'notification.created',
    NOTIFICATION_DELIVERED = 'notification.delivered',
    NOTIFICATION_READ = 'notification.read',  // System events
    API_ERROR = 'system.api.error',
    SCHEDULER_COMPLETED = 'system.scheduler.completed',
    SCHEDULER_FAILED = 'system.scheduler.failed'
}// Define event payload interfaces
export interface BaseEventPayload {
    timestamp: Date;
    initiator?: string; // User ID or system
}export interface CompanyEventPayload extends BaseEventPayload {
    companyId: string;
    data: any;
}export interface UserEventPayload extends BaseEventPayload {
    userId: string;
    companyId: string;
    data: any;
}export interface VehicleEventPayload extends BaseEventPayload {
    vehicleId: string;
    companyId: string;
    data: any;
}export interface ComplianceEventPayload extends BaseEventPayload {
    vehicleId: string;
    companyId: string;
    complianceType: string; // e.g., 'insurance', 'permit', 'fitness'
    expiryDate: Date;
    daysRemaining: number;
    data: any;
}export interface ChallanEventPayload extends BaseEventPayload {
    challanId: string;
    vehicleId: string;
    companyId: string;
    amount: number;
    data: any;
}export interface NotificationEventPayload extends BaseEventPayload {
    notificationId: string;
    userId?: string;
    companyId: string;
    channel?: string; // email, sms, push, etc.
    data: any;
}export interface SystemEventPayload extends BaseEventPayload {
    component: string;
    error?: any;
    data: any;
}// Helper function to create standard event payloads
export function createEventPayload(
    payload: any,
    initiator?: string
): BaseEventPayload {
    return {
        ...payload,
        timestamp: new Date(),
        initiator
    };
}