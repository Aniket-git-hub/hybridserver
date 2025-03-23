// Companies
companies {
id: UUID PRIMARY KEY,
name: String NOT NULL,
address: String,
city: String,
state: String,
pincode: String,
gst_number: String,
contact_email: String NOT NULL,
contact_phone: String NOT NULL,
logo_url: String,
website: String,
business_type: String,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp,
status: Enum [active, inactive, suspended] DEFAULT 'active'
}

// Users
users {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
name: String NOT NULL,
email: String UNIQUE NOT NULL,
phone: String,
password_hash: String NOT NULL,
role: Enum [owner, admin, manager, viewer] DEFAULT 'viewer',
profile_image_url: String,
email_verified: Boolean DEFAULT false,
phone_verified: Boolean DEFAULT false,
last_login: Timestamp,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp,
status: Enum [active, inactive, pending] DEFAULT 'pending'
}

// User Invitations
user_invitations {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
inviter_id: UUID REFERENCES users(id),
email: String NOT NULL,
role: Enum [admin, manager, viewer],
invitation_token: String UNIQUE NOT NULL,
expires_at: Timestamp NOT NULL,
created_at: Timestamp NOT NULL DEFAULT NOW(),
status: Enum [pending, accepted, expired] DEFAULT 'pending'
}

// Subscription Plans
subscription_plans {
id: UUID PRIMARY KEY,
name: String NOT NULL,
description: Text,
price_monthly: Decimal NOT NULL,
price_yearly: Decimal NOT NULL,
max_vehicles: Integer NOT NULL,
max_users: Integer NOT NULL,
features: JSON,
is_custom: Boolean DEFAULT false,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp,
is_active: Boolean DEFAULT true
}

// Company Subscriptions
company_subscriptions {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
plan_id: UUID REFERENCES subscription_plans(id),
start_date: Date NOT NULL,
end_date: Date NOT NULL,
payment_status: Enum [pending, paid, failed] DEFAULT 'pending',
amount_paid: Decimal NOT NULL,
payment_method: String,
invoice_id: String,
renewal_status: Enum [auto, manual, cancelled] DEFAULT 'manual',
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp,
status: Enum [active, expired, cancelled] DEFAULT 'active'
}

// Vehicles
vehicles {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),

// Basic vehicle identification - from API
registration_number: String UNIQUE NOT NULL,
chassis_number: String,
engine_number: String,

// Vehicle details - from API
vehicle_class: String,
vehicle_category: String,
maker: String,
model: String,
manufactured_date: Date,
fuel_type: String,
fuel_norms: String,
vehicle_color: String,
body_type: String,

// Technical specifications - from API
unladen_weight: Integer,
gross_weight: Integer,
number_of_cylinders: Integer,
cubic_capacity: Integer,
seating_capacity: Integer,
standing_capacity: Integer,
sleeper_capacity: Integer,
wheel_base: Integer,

// Status tracking
last_api_sync: Timestamp,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp,
status: Enum [active, inactive, sold] DEFAULT 'active'
}

// Vehicle Owners
vehicle_owners {
id: UUID PRIMARY KEY,
vehicle_id: UUID REFERENCES vehicles(id),
owner_name: String NOT NULL,
father_name: String,
permanent_address: Text,
present_address: Text,
mobile_number: String,
owner_serial_number: Integer,
is_current: Boolean DEFAULT true,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// Vehicle Compliance
vehicle_compliance {
id: UUID PRIMARY KEY,
vehicle_id: UUID REFERENCES vehicles(id),

// Registration details
registration_date: Date,
registration_valid_until: Date,
registration_rto: String,
registration_state: String,
registration_status: String,

// Compliance dates
fitness_valid_until: Date,
tax_valid_until: Date,
insurance_valid_until: Date,
puc_valid_until: Date,

// Insurance details
insurance_provider: String,
insurance_policy_number: String,

// Permit details
permit_type: String,
permit_number: String,
permit_issue_date: Date,
permit_valid_from: Date,
permit_valid_until: Date,
national_permit_number: String,
national_permit_valid_until: Date,
national_permit_issued_by: String,

// Other details
financer_details: String,
blacklist_status: String,
noc_details: String,

last_api_sync: Timestamp,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// Challans (Traffic Violations)
challans {
id: UUID PRIMARY KEY,
vehicle_id: UUID REFERENCES vehicles(id),

// From API response
challan_number: String UNIQUE NOT NULL,
challan_date: Timestamp NOT NULL,
challan_amount: Decimal NOT NULL,
challan_status: Enum [pending, disposed] NOT NULL,
challan_payment_date: Timestamp,
violator_name: String,
transaction_id: String,
payment_source: String,
state: String,

// URLs from API
challan_url: String,
receipt_url: String,
payment_url: String,

// Local tracking
is_notified: Boolean DEFAULT false,
api_response_data: JSON,
last_api_sync: Timestamp,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// Challan Offences (detailed breakdown of each violation)
challan_offences {
id: UUID PRIMARY KEY,
challan_id: UUID REFERENCES challans(id),

// From API response
external_id: String,
external_challan_id: String,
offence_name: String NOT NULL,
mva_section: String,
penalty_amount: Decimal NOT NULL,
created_at: Timestamp NOT NULL DEFAULT NOW(),
}

// Driver Licenses (for future use)
driver_licenses {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
license_number: String UNIQUE NOT NULL,
name: String NOT NULL,
dob: Date,
gender: String,
blood_group: String,
current_status: String,
date_of_issue: Date,
non_transport_valid_from: Date,
non_transport_valid_until: Date,
transport_valid_from: Date,
transport_valid_until: Date,
hazardous_valid_until: Date,
hill_valid_until: Date,
vehicle_classes: JSON, // Store array of allowed vehicle classes
issuing_authority: String,
last_api_sync: Timestamp,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// Vehicle-Driver Assignments
vehicle_driver_assignments {
id: UUID PRIMARY KEY,
vehicle_id: UUID REFERENCES vehicles(id),
driver_license_id: UUID REFERENCES driver_licenses(id),
start_date: Date NOT NULL,
end_date: Date,
is_primary: Boolean DEFAULT true,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp,
status: Enum [active, inactive] DEFAULT 'active'
}

// Notifications
notifications {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
user_id: UUID REFERENCES users(id) NULL,
vehicle_id: UUID REFERENCES vehicles(id) NULL,

title: String NOT NULL,
message: Text NOT NULL,

notification_type: Enum [
challan, registration_expiry, insurance_expiry,
puc_expiry, fitness_expiry, tax_expiry, permit_expiry,
system, subscription
] NOT NULL,

reference_id: UUID, // challan_id, vehicle_compliance_id, etc.
severity: Enum [info, warning, critical] DEFAULT 'info',

// Delivery status tracking
is_read: Boolean DEFAULT false,
email_status: Enum [pending, sent, failed, not_applicable] DEFAULT 'pending',
sms_status: Enum [pending, sent, failed, not_applicable] DEFAULT 'pending',
push_status: Enum [pending, sent, failed, not_applicable] DEFAULT 'pending',

created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// User Notification Settings
user_notification_settings {
id: UUID PRIMARY KEY,
user_id: UUID REFERENCES users(id),
challan_alerts: Boolean DEFAULT true,
registration_expiry_alerts: Boolean DEFAULT true,
insurance_expiry_alerts: Boolean DEFAULT true,
puc_expiry_alerts: Boolean DEFAULT true,
fitness_expiry_alerts: Boolean DEFAULT true,
tax_expiry_alerts: Boolean DEFAULT true,
permit_expiry_alerts: Boolean DEFAULT true,
system_notifications: Boolean DEFAULT true,

email_enabled: Boolean DEFAULT true,
sms_enabled: Boolean DEFAULT true,
push_enabled: Boolean DEFAULT true,

advance_reminder_days: Integer DEFAULT 30,
created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// Payment Transactions
payment_transactions {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
subscription_id: UUID REFERENCES company_subscriptions(id) NULL,

amount: Decimal NOT NULL,
currency: String DEFAULT 'INR',
payment_method: String,
transaction_id: String,
reference_number: String,

status: Enum [initiated, pending, completed, failed, refunded] DEFAULT 'initiated',
payment_gateway: String,
gateway_response: JSON,
failure_reason: String,

invoice_number: String,
receipt_url: String,

created_at: Timestamp NOT NULL DEFAULT NOW(),
updated_at: Timestamp
}

// API Request Logs
api_request_logs {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
endpoint: String NOT NULL,
request_type: String NOT NULL,
parameters: JSON,
response_code: Integer,
response_body: JSON,
execution_time_ms: Integer,
created_at: Timestamp NOT NULL DEFAULT NOW()
}

// Audit Logs
audit_logs {
id: UUID PRIMARY KEY,
company_id: UUID REFERENCES companies(id),
user_id: UUID REFERENCES users(id) NULL,
action: String NOT NULL,
entity_type: String NOT NULL,
entity_id: UUID NOT NULL,
old_values: JSON NULL,
new_values: JSON NULL,
ip_address: String,
user_agent: String,
created_at: Timestamp NOT NULL DEFAULT NOW()
}

// Archicture

Architectural Design for Vehicle Fleet Management System
I'll design a comprehensive architecture for your vehicle fleet management system, focusing on the organization of controllers, services, repositories, and the overall flow of the application.
System Architecture Overview
CopyClient (Web/Mobile)
↓ ↑
API Gateway/Load Balancer
↓ ↑
Controllers
↓ ↑
Services
↓ ↑
Repositories
↓ ↑
Database
Core Modules

Authentication & Authorization
Company Management
User Management
Subscription & Billing
Vehicle Management
Compliance Management
Challan Management
Driver Management
Notification System
Analytics & Reporting
Admin Panel

Detailed Module Structure

1. Authentication & Authorization Module
   Controllers:

AuthController: Handles login, registration, password reset, token refresh
VerificationController: Handles email/phone verification flows

Services:

AuthService: Core authentication logic, token generation/validation
VerificationService: Handles verification codes and validation
PermissionService: Manages role-based permissions

Repositories:

UserRepository: Database operations for user authentication

2. Company Management Module
   Controllers:

CompanyController: CRUD operations for companies
CompanySettingsController: Manage company settings

Services:

CompanyService: Business logic for company operations
CompanySettingsService: Handles company configuration

Repositories:

CompanyRepository: Database operations for companies

3. User Management Module
   Controllers:

UserController: CRUD operations for users
TeamController: Manage team members
InvitationController: Handle team invitations

Services:

UserService: Business logic for user operations
TeamService: Manages team structure
InvitationService: Handles invitation workflows

Repositories:

UserRepository: Database operations for users
InvitationRepository: Database operations for invitations

4. Subscription & Billing Module
   Controllers:

SubscriptionController: Manage subscriptions
BillingController: Handle payments
PlanController: View available plans

Services:

SubscriptionService: Subscription logic
BillingService: Payment processing
PlanService: Plan management

Repositories:

SubscriptionRepository: Database operations for subscriptions
PaymentRepository: Database operations for payments
PlanRepository: Database operations for subscription plans

5. Vehicle Management Module
   Controllers:

VehicleController: CRUD operations for vehicles
VehicleOwnerController: Manage vehicle ownership

Services:

VehicleService: Business logic for vehicle operations
VehicleImportService: Bulk import functionality
VehicleOwnerService: Owner management

Repositories:

VehicleRepository: Database operations for vehicles
VehicleOwnerRepository: Database operations for vehicle owners

6. Compliance Management Module
   Controllers:

ComplianceController: Manage vehicle compliance documents
DocumentReminderController: Handle expiry reminders

Services:

ComplianceService: Business logic for compliance tracking
DocumentReminderService: Reminder scheduling
ComplianceCheckService: Regular checks for expired documents

Repositories:

ComplianceRepository: Database operations for vehicle compliance

7. Challan Management Module
   Controllers:

ChallanController: CRUD operations for challans
ChallanTrackingController: Track challan status

Services:

ChallanService: Business logic for challan operations
ChallanSyncService: Synchronize with external API
ChallanReminderService: Send reminders for unpaid challans

Repositories:

ChallanRepository: Database operations for challans
ChallanOffenceRepository: Database operations for challan offences

8. Driver Management Module
   Controllers:

DriverController: CRUD operations for drivers
DriverLicenseController: Manage licenses
DriverAssignmentController: Assign drivers to vehicles

Services:

DriverService: Business logic for driver operations
LicenseService: License validation and tracking
DriverAssignmentService: Manage vehicle-driver assignments

Repositories:

DriverRepository: Database operations for drivers
DriverAssignmentRepository: Database operations for assignments

9. Notification System Module
   Controllers:

NotificationController: Manage user notifications
NotificationSettingsController: Configure notification preferences

Services:

NotificationService: Core notification logic
EmailService: Email delivery
SMSService: SMS delivery
PushNotificationService: Mobile push notifications
NotificationQueueService: Queue management for notifications

Repositories:

NotificationRepository: Database operations for notifications
NotificationSettingsRepository: Database operations for settings

10. Analytics & Reporting Module
    Controllers:

ReportController: Generate various reports
DashboardController: Dashboard data

Services:

ReportService: Report generation
DashboardService: Dashboard data aggregation
AnalyticsService: Advanced analytics

Repositories:

ReportRepository: Database operations for reports
AnalyticsRepository: Complex queries for analytics

11. Admin Panel Module
    Controllers:

AdminController: Admin operations
SystemSettingsController: Manage system settings

Services:

AdminService: Admin operations
SystemSettingsService: System configuration

Repositories:

AdminRepository: Database operations for admin functions

Flow Diagrams for Key Processes

1. User Registration & Company Setup Flow
   Copy1. User signs up → AuthController.register()
2. AuthService creates user → UserRepository.save()
3. VerificationService sends verification email → EmailService.send()
4. User verifies email → VerificationController.verify()
5. User creates company → CompanyController.create()
6. CompanyService creates company → CompanyRepository.save()
7. SubscriptionService assigns free trial → SubscriptionRepository.save()
8. User redirected to dashboard
9. Vehicle Registration Flow
   Copy1. User adds vehicle → VehicleController.create()
10. VehicleService validates data
11. VehicleService creates vehicle → VehicleRepository.save()
12. VehicleService creates owner record → VehicleOwnerRepository.save()
13. ComplianceService creates compliance record → ComplianceRepository.save()
14. VehicleService initiates API sync → External API calls
15. VehicleService updates with external data
16. NotificationService sends confirmation → NotificationRepository.save()
17. Compliance Monitoring Flow
    Copy1. Scheduled task runs → ComplianceCheckService.checkExpiringDocuments()
18. ComplianceCheckService identifies near-expiry documents
19. NotificationService creates notifications → NotificationRepository.save()
20. EmailService/SMSService sends alerts
21. Dashboard updated with expiry warnings
22. Challan Detection & Notification Flow
    Copy1. Scheduled task runs → ChallanSyncService.syncChallans()
23. ChallanSyncService calls external API for each vehicle
24. ChallanService processes new challans → ChallanRepository.save()
25. ChallanService creates offence records → ChallanOffenceRepository.save()
26. NotificationService creates notifications → NotificationRepository.save()
27. EmailService/SMSService sends alerts
28. Dashboard updated with new challans
29. Team Management Flow
    Copy1. Company admin invites user → InvitationController.invite()
30. InvitationService creates invitation → InvitationRepository.save()
31. EmailService sends invitation email
32. Invitee clicks link → InvitationController.accept()
33. InvitationService validates invitation
34. UserService creates user account → UserRepository.save()
35. TeamService adds user to company → UserRepository.update()
36. NotificationService notifies admin → NotificationRepository.save()
37. Subscription Management Flow
    Copy1. User selects plan → SubscriptionController.subscribe()
38. SubscriptionService validates plan eligibility
39. BillingService initiates payment → External payment gateway
40. BillingService records transaction → PaymentRepository.save()
41. SubscriptionService activates subscription → SubscriptionRepository.update()
42. NotificationService sends confirmation → NotificationRepository.save()
43. User access updated based on new plan
    Event-Driven Architecture Components
    Consider implementing these event-driven features for greater scalability:
    Event Publishers:

DocumentExpiryPublisher: Publishes events when documents are nearing expiry
ChallanDetectedPublisher: Publishes events when new challans are detected
SubscriptionChangedPublisher: Publishes events when subscriptions change

Event Consumers:

NotificationConsumer: Consumes events and generates notifications
ReportingConsumer: Updates analytics data based on system events
ComplianceAuditConsumer: Records compliance-related events for auditing

Middleware Components

Authentication Middleware: Validates JWT tokens
Subscription Middleware: Enforces subscription limits
Logging Middleware: Records API access and operations
Rate Limiting Middleware: Prevents API abuse
Error Handling Middleware: Standardizes error responses

External Integrations

Vehicle Registration API: Validate and fetch vehicle details
Challan API: Fetch challan information
SMS Gateway: Send SMS notifications
Email Service: Send email notifications
Payment Gateway: Process subscription payments

Development Guidelines
Controller Principles:

Thin controllers - only request/response handling
Validation of inputs
Appropriate HTTP status codes
Consistent error handling
Route versioning (e.g., /api/v1/vehicles)

Service Principles:

Business logic encapsulation
Transaction management
Cross-cutting concerns (logging, events)
No direct database queries
Separation of concerns

Repository Principles:

One repository per entity
Query encapsulation
No business logic
Efficient query patterns
Pagination support

Implementation Roadmap
Phase 1: Core Infrastructure

Authentication system
Company management
Basic user management
Basic vehicle management

Phase 2: Compliance & Challan Tracking

Vehicle compliance tracking
Challan integration
Basic notification system
Document expiry reminders

Phase 3: Advanced Features

Subscription & billing system
Team management
Driver management
Advanced analytics
Mobile app support

Phase 4: Optimization & Scale

Performance improvements
Enhanced security features
Advanced reporting
API for third-party integration

Example Controller Structure
typescriptCopy// Example: VehicleController.ts

import { Request, Response } from 'express';
import { VehicleService } from '../services/VehicleService';

export class VehicleController {
constructor(private vehicleService: VehicleService) {}

async getAll(req: Request, res: Response) {
const { companyId } = req.user;
const { page = 1, limit = 10, status } = req.query;

    try {
      const vehicles = await this.vehicleService.getVehicles(
        companyId,
        { page: Number(page), limit: Number(limit), status }
      );

      return res.status(200).json(vehicles);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }

}

async getById(req: Request, res: Response) {
const { companyId } = req.user;
const { id } = req.params;

    try {
      const vehicle = await this.vehicleService.getVehicleById(companyId, id);

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      return res.status(200).json(vehicle);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }

}

async create(req: Request, res: Response) {
const { companyId } = req.user;
const vehicleData = req.body;

    try {
      const newVehicle = await this.vehicleService.createVehicle(companyId, vehicleData);
      return res.status(201).json(newVehicle);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }

}

// Other methods...
}
Example Service Structure
typescriptCopy// Example: VehicleService.ts

import { VehicleRepository } from '../repositories/VehicleRepository';
import { ComplianceRepository } from '../repositories/ComplianceRepository';
import { NotificationService } from './NotificationService';
import { ExternalVehicleAPI } from '../integrations/ExternalVehicleAPI';

export class VehicleService {
constructor(
private vehicleRepository: VehicleRepository,
private complianceRepository: ComplianceRepository,
private notificationService: NotificationService,
private externalVehicleAPI: ExternalVehicleAPI
) {}

async getVehicles(companyId: string, options: any) {
return this.vehicleRepository.findByCompany(companyId, options);
}

async getVehicleById(companyId: string, id: string) {
return this.vehicleRepository.findById(id, companyId);
}

async createVehicle(companyId: string, vehicleData: any) {
// Validate vehicle data
this.validateVehicleData(vehicleData);

    // Check for duplicate registration number
    const existing = await this.vehicleRepository.findByRegistrationNumber(
      vehicleData.registrationNumber
    );

    if (existing) {
      throw new Error('Vehicle with this registration number already exists');
    }

    // Create vehicle record
    const vehicle = await this.vehicleRepository.create({
      ...vehicleData,
      companyId,
      status: 'active'
    });

    // Create initial compliance record
    await this.complianceRepository.create({
      vehicleId: vehicle.id,
      registrationDate: vehicleData.registrationDate || new Date(),
      // Other compliance fields...
    });

    // Sync with external API if available
    try {
      const externalData = await this.externalVehicleAPI.getVehicleDetails(
        vehicleData.registrationNumber
      );

      if (externalData) {
        // Update with external data
        await this.updateVehicleWithExternalData(vehicle.id, externalData);
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to sync with external API:', error);
    }

    // Send notification
    await this.notificationService.sendVehicleAddedNotification(companyId, vehicle);

    return vehicle;

}

private validateVehicleData(data: any) {
// Validation logic here
if (!data.registrationNumber) {
throw new Error('Registration number is required');
}

    // More validation...

}

private async updateVehicleWithExternalData(vehicleId: string, externalData: any) {
// Update logic
// Update vehicle
await this.vehicleRepository.update(vehicleId, {
// Mapping external data to vehicle fields
});

    // Update compliance
    await this.complianceRepository.updateByVehicleId(vehicleId, {
      // Mapping external data to compliance fields
    });

}

// Other methods...
}
This architectural design provides a robust foundation for your vehicle fleet management system, with clear separation of concerns, scalable components, and well-defined flows for key business processes.
