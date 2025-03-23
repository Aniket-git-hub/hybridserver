CREATE TABLE `challan_offences` (
	`id` varchar(128) NOT NULL,
	`challan_id` varchar(128) NOT NULL,
	`external_id` varchar(100),
	`external_challan_id` varchar(100),
	`offence_name` varchar(255) NOT NULL,
	`mva_section` varchar(255),
	`penalty_amount` decimal(10,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challan_offences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challans` (
	`id` varchar(128) NOT NULL,
	`vehicle_id` varchar(128) NOT NULL,
	`challan_number` varchar(100) NOT NULL,
	`challan_date` timestamp NOT NULL,
	`challan_amount` decimal(10,2) NOT NULL,
	`challan_status` varchar(20) NOT NULL,
	`challan_payment_date` timestamp,
	`violator_name` varchar(255),
	`transaction_id` varchar(100),
	`payment_source` varchar(100),
	`state` varchar(50),
	`challan_url` varchar(255),
	`receipt_url` varchar(255),
	`payment_url` varchar(255),
	`is_notified` boolean DEFAULT false,
	`api_response_data` json,
	`last_api_sync` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challans_id` PRIMARY KEY(`id`),
	CONSTRAINT `challans_challan_number_unique` UNIQUE(`challan_number`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`pincode` varchar(20),
	`gst_number` varchar(20),
	`contact_email` varchar(255) NOT NULL,
	`contact_phone` varchar(20) NOT NULL,
	`logo_url` varchar(255),
	`website` varchar(255),
	`business_type` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_compliance` (
	`id` varchar(128) NOT NULL,
	`vehicle_id` varchar(128) NOT NULL,
	`registration_date` date,
	`registration_valid_until` date,
	`registration_rto` varchar(255),
	`registration_state` varchar(100),
	`registration_status` varchar(50),
	`fitness_valid_until` date,
	`tax_valid_until` date,
	`insurance_valid_until` date,
	`puc_valid_until` date,
	`insurance_provider` varchar(255),
	`insurance_policy_number` varchar(100),
	`permit_type` varchar(100),
	`permit_number` varchar(100),
	`permit_issue_date` date,
	`permit_valid_from` date,
	`permit_valid_until` date,
	`national_permit_number` varchar(100),
	`national_permit_valid_until` date,
	`national_permit_issued_by` varchar(255),
	`financer_details` varchar(255),
	`blacklist_status` varchar(100),
	`noc_details` varchar(255),
	`last_api_sync` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_compliance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_licenses` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`license_number` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`dob` date,
	`gender` varchar(20),
	`blood_group` varchar(10),
	`current_status` varchar(50),
	`date_of_issue` date,
	`non_transport_valid_from` date,
	`non_transport_valid_until` date,
	`transport_valid_from` date,
	`transport_valid_until` date,
	`hazardous_valid_until` date,
	`hill_valid_until` date,
	`vehicle_classes` json,
	`issuing_authority` varchar(255),
	`last_api_sync` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_licenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_licenses_license_number_unique` UNIQUE(`license_number`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_driver_assignments` (
	`id` varchar(128) NOT NULL,
	`vehicle_id` varchar(128) NOT NULL,
	`driver_license_id` varchar(128) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`is_primary` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `vehicle_driver_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_request_logs` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128),
	`endpoint` varchar(255) NOT NULL,
	`request_type` varchar(20) NOT NULL,
	`parameters` json,
	`response_code` int,
	`response_body` json,
	`execution_time_ms` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_request_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128),
	`user_id` varchar(128),
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(100) NOT NULL,
	`entity_id` varchar(128) NOT NULL,
	`old_values` json,
	`new_values` json,
	`ip_address` varchar(50),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`user_id` varchar(128),
	`vehicle_id` varchar(128),
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`notification_type` varchar(50) NOT NULL,
	`reference_id` varchar(128),
	`severity` varchar(20) NOT NULL DEFAULT 'info',
	`is_read` boolean DEFAULT false,
	`email_status` varchar(20) NOT NULL DEFAULT 'pending',
	`sms_status` varchar(20) NOT NULL DEFAULT 'pending',
	`push_status` varchar(20) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_notification_settings` (
	`id` varchar(128) NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`challan_alerts` boolean DEFAULT true,
	`registration_expiry_alerts` boolean DEFAULT true,
	`insurance_expiry_alerts` boolean DEFAULT true,
	`puc_expiry_alerts` boolean DEFAULT true,
	`fitness_expiry_alerts` boolean DEFAULT true,
	`tax_expiry_alerts` boolean DEFAULT true,
	`permit_expiry_alerts` boolean DEFAULT true,
	`system_notifications` boolean DEFAULT true,
	`email_enabled` boolean DEFAULT true,
	`sms_enabled` boolean DEFAULT true,
	`push_enabled` boolean DEFAULT true,
	`advance_reminder_days` varchar(3) DEFAULT '30',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_notification_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`subscription_id` varchar(128),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'INR',
	`payment_method` varchar(50),
	`transaction_id` varchar(100),
	`reference_number` varchar(100),
	`status` varchar(20) NOT NULL DEFAULT 'initiated',
	`payment_gateway` varchar(50),
	`gateway_response` json,
	`failure_reason` varchar(255),
	`invoice_number` varchar(100),
	`receipt_url` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_subscriptions` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`plan_id` varchar(128) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`payment_status` varchar(20) NOT NULL DEFAULT 'pending',
	`amount_paid` decimal(10,2) NOT NULL,
	`payment_method` varchar(50),
	`invoice_id` varchar(128),
	`renewal_status` varchar(20) NOT NULL DEFAULT 'manual',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT `company_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(1000),
	`price_monthly` decimal(10,2) NOT NULL,
	`price_yearly` decimal(10,2) NOT NULL,
	`max_vehicles` int NOT NULL,
	`max_users` int NOT NULL,
	`features` json,
	`is_custom` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_invitations` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`inviter_id` varchar(128) NOT NULL,
	`email` varchar(255) NOT NULL,
	`role` varchar(20) NOT NULL,
	`invitation_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitations_invitation_token_unique` UNIQUE(`invitation_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'viewer',
	`profile_image_url` varchar(255),
	`email_verified` boolean DEFAULT false,
	`phone_verified` boolean DEFAULT false,
	`last_login` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_owners` (
	`id` varchar(128) NOT NULL,
	`vehicle_id` varchar(128) NOT NULL,
	`owner_name` varchar(255) NOT NULL,
	`father_name` varchar(255),
	`permanent_address` varchar(500),
	`present_address` varchar(500),
	`mobile_number` varchar(20),
	`owner_serial_number` int,
	`is_current` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` varchar(128) NOT NULL,
	`company_id` varchar(128) NOT NULL,
	`registration_number` varchar(50) NOT NULL,
	`chassis_number` varchar(100),
	`engine_number` varchar(100),
	`vehicle_class` varchar(100),
	`vehicle_category` varchar(100),
	`maker` varchar(100),
	`model` varchar(100),
	`manufactured_date` date,
	`fuel_type` varchar(50),
	`fuel_norms` varchar(50),
	`vehicle_color` varchar(50),
	`body_type` varchar(100),
	`unladen_weight` int,
	`gross_weight` int,
	`number_of_cylinders` int,
	`cubic_capacity` int,
	`seating_capacity` int,
	`standing_capacity` int,
	`sleeper_capacity` int,
	`wheel_base` int,
	`last_api_sync` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_registration_number_unique` UNIQUE(`registration_number`)
);
--> statement-breakpoint
ALTER TABLE `challan_offences` ADD CONSTRAINT `challan_offences_challan_id_challans_id_fk` FOREIGN KEY (`challan_id`) REFERENCES `challans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `challans` ADD CONSTRAINT `challans_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_compliance` ADD CONSTRAINT `vehicle_compliance_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_licenses` ADD CONSTRAINT `driver_licenses_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_driver_assignments` ADD CONSTRAINT `vda_vehicle_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_driver_assignments` ADD CONSTRAINT `vda_driver_fk` FOREIGN KEY (`driver_license_id`) REFERENCES `driver_licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_request_logs` ADD CONSTRAINT `api_request_logs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notification_settings` ADD CONSTRAINT `user_notification_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_subscription_id_company_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `company_subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_subscriptions` ADD CONSTRAINT `company_subscriptions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_subscriptions` ADD CONSTRAINT `company_subscriptions_plan_id_subscription_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_inviter_id_users_id_fk` FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_owners` ADD CONSTRAINT `vehicle_owners_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;