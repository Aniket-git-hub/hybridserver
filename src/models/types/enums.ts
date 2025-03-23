export const UserRole = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MANAGER: 'manager',
    VIEWER: 'viewer',
} as const;

export const UserStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
} as const;

export const CompanyStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
} as const;

export const InvitationStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    EXPIRED: 'expired',
} as const;

export const PaymentStatus = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
} as const;

export const SubscriptionStatus = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
} as const;

export const RenewalStatus = {
    AUTO: 'auto',
    MANUAL: 'manual',
    CANCELLED: 'cancelled',
} as const;

export const VehicleStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SOLD: 'sold',
} as const;

export const ChallanStatus = {
    PENDING: 'pending',
    DISPOSED: 'disposed',
} as const;

export const NotificationType = {
    CHALLAN: 'challan',
    REGISTRATION_EXPIRY: 'registration_expiry',
    INSURANCE_EXPIRY: 'insurance_expiry',
    PUC_EXPIRY: 'puc_expiry',
    FITNESS_EXPIRY: 'fitness_expiry',
    TAX_EXPIRY: 'tax_expiry',
    PERMIT_EXPIRY: 'permit_expiry',
    SYSTEM: 'system',
    SUBSCRIPTION: 'subscription',
} as const;

export const NotificationSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
} as const;

export const DeliveryStatus = {
    PENDING: 'pending',
    SENT: 'sent',
    FAILED: 'failed',
    NOT_APPLICABLE: 'not_applicable',
} as const;

export const TransactionStatus = {
    INITIATED: 'initiated',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
} as const;