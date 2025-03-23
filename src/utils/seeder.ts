// src/utils/seeder.ts
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { closeDB, connectDB, db } from '../config/db';
const logger = require('../utils/logger');

// Import all models and types
import {
    challanOffences,
    challans,
    companies,
    companySubscriptions,
    driverLicenses,
    notifications,
    paymentTransactions,
    subscriptionPlans,
    userNotificationSettings,
    users,
    vehicleCompliance,
    vehicleDriverAssignments,
    vehicleOwners,
    vehicles,
} from '../models';

// Define types for data structures
interface CompanyData {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber: string;
    contactEmail: string;
    contactPhone: string;
    logoUrl: string;
    website: string;
    businessType: string;
    status: string;
}

interface UserData {
    id: string;
    companyId: string;
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    status: string;
}

interface NotificationSettingData {
    id: string;
    userId: string;
    challanAlerts: boolean;
    registrationExpiryAlerts: boolean;
    insuranceExpiryAlerts: boolean;
    pucExpiryAlerts: boolean;
    fitnessExpiryAlerts: boolean;
    taxExpiryAlerts: boolean;
    permitExpiryAlerts: boolean;
    systemNotifications: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    advanceReminderDays: string;
}

interface SubscriptionPlanData {
    id: string;
    name: string;
    description: string;
    priceMonthly: string;
    priceYearly: string;
    maxVehicles: number;
    maxUsers: number;
    features: string;
    isActive: boolean;
}

interface CompanySubscriptionData {
    id: string;
    companyId: string;
    planId: string;
    startDate: Date;
    endDate: Date;
    paymentStatus: string;
    amountPaid: string;
    paymentMethod: string;
    invoiceId: string;
    renewalStatus: string;
    status: string;
}

interface PaymentTransactionData {
    id: string;
    companyId: string;
    subscriptionId: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    transactionId: string;
    referenceNumber: string;
    status: string;
    paymentGateway: string;
    gatewayResponse: string;
    invoiceNumber: string;
    receiptUrl: string;
}

interface VehicleData {
    id: string;
    companyId: string;
    registrationNumber: string;
    chassisNumber: string;
    engineNumber: string;
    vehicleClass: string;
    vehicleCategory: string;
    maker: string;
    model: string;
    manufacturedDate: Date;
    fuelType: string;
    fuelNorms: string;
    vehicleColor: string;
    bodyType: string;
    status: string;
    lastApiSync?: Date;
}

interface VehicleOwnerData {
    id: string;
    vehicleId: string;
    ownerName: string;
    fatherName: string;
    permanentAddress: string;
    presentAddress: string;
    mobileNumber: string;
    ownerSerialNumber: number;
    isCurrent: boolean;
}

interface VehicleComplianceData {
    id: string;
    vehicleId: string;
    registrationDate: Date;
    registrationValidUntil: Date;
    registrationRto: string;
    registrationState: string;
    registrationStatus: string;
    fitnessValidUntil: Date;
    taxValidUntil: Date;
    insuranceValidUntil: Date;
    pucValidUntil: Date;
    insuranceProvider: string;
    insurancePolicyNumber: string;
    permitType: string;
    permitNumber: string;
    permitIssueDate: Date;
    permitValidFrom: Date;
    permitValidUntil: Date;
    nationalPermitNumber?: string;
    nationalPermitValidUntil?: Date;
    nationalPermitIssuedBy?: string;
    financerDetails?: string;
    blacklistStatus?: string;
    nocDetails?: string;
    lastApiSync?: Date;
}

interface ChallanData {
    id: string;
    vehicleId: string;
    challanNumber: string;
    challanDate: Date;
    challanAmount: string;
    challanStatus: string;
    challanPaymentDate: Date | null;
    violatorName: string;
    transactionId: string | null;
    paymentSource?: string | null;
    state: string;
    isNotified: boolean;
    apiResponseData?: any;
    lastApiSync?: Date;
}

interface ChallanOffenceData {
    id: string;
    challanId: string;
    externalId: string;
    externalChallanId: string;
    offenceName: string;
    mvaSection: string;
    penaltyAmount: string;
}

interface NotificationData {
    id: string;
    companyId: string;
    userId?: string;
    vehicleId?: string;
    title: string;
    message: string;
    notificationType: string;
    referenceId?: string;
    severity: string;
    isRead: boolean;
    emailStatus: string;
    smsStatus: string;
    pushStatus: string;
    createdAt: Date;
}

interface DriverLicenseData {
    id: string;
    companyId: string;
    licenseNumber: string;
    name: string;
    dob: Date;
    gender: string;
    bloodGroup: string;
    currentStatus: string;
    dateOfIssue: Date;
    nonTransportValidFrom: Date;
    nonTransportValidUntil: Date;
    transportValidFrom: Date;
    transportValidUntil: Date;
    hazardousValidUntil?: Date;
    hillValidUntil?: Date;
    vehicleClasses: string;
    issuingAuthority: string;
    lastApiSync?: Date;
}

interface VehicleDriverAssignmentData {
    id: string;
    vehicleId: string;
    driverLicenseId: string;
    startDate: Date;
    endDate?: Date;
    isPrimary: boolean;
    status: string;
}

interface CSVVehicleData {
    registrationNumber: string;
    chassisNumber?: string;
    engineNumber?: string;
    vehicleClass?: string;
    vehicleCategory?: string;
    maker?: string;
    model?: string;
    manufacturedDate?: string;
    fuelType?: string;
    fuelNorms?: string;
    vehicleColor?: string;
    bodyType?: string;
}

interface CSVChallanData {
    challanNumber?: string;
    challanDate?: string;
    challanAmount?: string;
    challanStatus?: string;
    challanPaymentDate?: string;
    violatorName?: string;
    transactionId?: string;
    state?: string;
}

// Load environment variables
dotenv.config();

// Helper function to read CSV files
const readCSV = <T>(filename: string): T[] => {
    try {
        const csvFilePath = path.resolve(__dirname, `../data/${filename}`);
        const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

        // Parse CSV
        return parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        }) as T[];
    } catch (error: any) {
        logger.error(`Error reading or parsing CSV ${filename}: ${error.message}`);
        return [];
    }
};

// Helper function to hash passwords
const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Helper function to get a random date
const getRandomFutureDate = (minMonths = 1, maxMonths = 18): Date => {
    const months = minMonths + Math.floor(Math.random() * (maxMonths - minMonths));
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
};

const getRandomPastDate = (minMonths = 1, maxMonths = 6): Date => {
    const months = minMonths + Math.floor(Math.random() * (maxMonths - minMonths));
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
};

// Import data
const importData = async (): Promise<boolean> => {
    try {
        // Connect to database
        await connectDB();
        logger.info('Connected to database');

        // Clear existing data
        await deleteData(false);

        logger.info('Previous data cleared...');

        // Sample data for companies
        const companyData: CompanyData[] = [
            {
                id: createId(),
                name: 'Fleet Master Logistics',
                address: '123 Transport Road',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                gstNumber: '27AABCS1429B1ZB',
                contactEmail: 'info@fleetmaster.com',
                contactPhone: '9876543210',
                logoUrl: 'https://example.com/logo.png',
                website: 'https://fleetmaster.com',
                businessType: 'Logistics',
                status: 'active'
            },
            {
                id: createId(),
                name: 'Roadrunner Transport',
                address: '456 Highway Avenue',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                gstNumber: '07AAACP2454C1ZO',
                contactEmail: 'contact@roadrunner.com',
                contactPhone: '8765432109',
                logoUrl: 'https://example.com/roadrunner.png',
                website: 'https://roadrunner.com',
                businessType: 'Transport',
                status: 'active'
            }
        ];

        // Insert companies
        await db.insert(companies).values(companyData);
        logger.info(`Added ${companyData.length} companies`);

        // Sample admin user for each company
        const userData: UserData[] = [];

        // Admin for Fleet Master
        const adminPasswordHash = await hashPassword('password123');
        userData.push({
            id: createId(),
            companyId: companyData[0].id,
            name: 'Admin User',
            email: 'admin@fleetmaster.com',
            phone: '9876543210',
            passwordHash: adminPasswordHash,
            role: 'owner',
            emailVerified: true,
            phoneVerified: true,
            status: 'active'
        });

        // Manager for Fleet Master
        userData.push({
            id: createId(),
            companyId: companyData[0].id,
            name: 'Manager User',
            email: 'manager@fleetmaster.com',
            phone: '9876543211',
            passwordHash: adminPasswordHash,
            role: 'manager',
            emailVerified: true,
            phoneVerified: true,
            status: 'active'
        });

        // Admin for Roadrunner
        userData.push({
            id: createId(),
            companyId: companyData[1].id,
            name: 'Admin Roadrunner',
            email: 'admin@roadrunner.com',
            phone: '8765432109',
            passwordHash: adminPasswordHash,
            role: 'owner',
            emailVerified: true,
            phoneVerified: true,
            status: 'active'
        });

        // Insert users
        await db.insert(users).values(userData);
        logger.info(`Added ${userData.length} users`);

        // Create notification settings for each user
        const notificationSettingsData: NotificationSettingData[] = userData.map(user => ({
            id: createId(),
            userId: user.id,
            challanAlerts: true,
            registrationExpiryAlerts: true,
            insuranceExpiryAlerts: true,
            pucExpiryAlerts: true,
            fitnessExpiryAlerts: true,
            taxExpiryAlerts: true,
            permitExpiryAlerts: true,
            systemNotifications: true,
            emailEnabled: true,
            smsEnabled: true,
            pushEnabled: true,
            advanceReminderDays: '30'
        }));

        await db.insert(userNotificationSettings).values(notificationSettingsData);
        logger.info(`Added notification settings for all users`);

        // Sample subscription plans
        const planData: SubscriptionPlanData[] = [
            {
                id: createId(),
                name: 'Basic Plan',
                description: 'For small fleets up to 10 vehicles',
                priceMonthly: '999',
                priceYearly: '9990',
                maxVehicles: 10,
                maxUsers: 3,
                features: JSON.stringify({
                    challanAlerts: true,
                    registrationAlerts: true,
                    insuranceAlerts: true,
                    pucAlerts: true
                }),
                isActive: true
            },
            {
                id: createId(),
                name: 'Standard Plan',
                description: 'For medium fleets up to 50 vehicles',
                priceMonthly: '2499',
                priceYearly: '24990',
                maxVehicles: 50,
                maxUsers: 10,
                features: JSON.stringify({
                    challanAlerts: true,
                    registrationAlerts: true,
                    insuranceAlerts: true,
                    pucAlerts: true,
                    fitnessAlerts: true,
                    taxAlerts: true,
                    apiAccess: true
                }),
                isActive: true
            },
            {
                id: createId(),
                name: 'Premium Plan',
                description: 'For large fleets with unlimited vehicles',
                priceMonthly: '4999',
                priceYearly: '49990',
                maxVehicles: 999,
                maxUsers: 999,
                features: JSON.stringify({
                    challanAlerts: true,
                    registrationAlerts: true,
                    insuranceAlerts: true,
                    pucAlerts: true,
                    fitnessAlerts: true,
                    taxAlerts: true,
                    permitAlerts: true,
                    apiAccess: true,
                    driverManagement: true,
                    advancedReports: true
                }),
                isActive: true
            }
        ];

        // Insert subscription plans
        await db.insert(subscriptionPlans).values(planData);
        logger.info(`Added ${planData.length} subscription plans`);

        // Subscribe companies to plans
        const subscriptionData: CompanySubscriptionData[] = [
            {
                id: createId(),
                companyId: companyData[0].id,
                planId: planData[1].id, // Standard plan for Fleet Master
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                paymentStatus: 'paid',
                amountPaid: '24990',
                paymentMethod: 'credit_card',
                invoiceId: 'INV-001-2024',
                renewalStatus: 'auto',
                status: 'active'
            },
            {
                id: createId(),
                companyId: companyData[1].id,
                planId: planData[0].id, // Basic plan for Roadrunner
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                paymentStatus: 'paid',
                amountPaid: '9990',
                paymentMethod: 'bank_transfer',
                invoiceId: 'INV-002-2024',
                renewalStatus: 'manual',
                status: 'active'
            }
        ];

        // Insert subscriptions
        await db.insert(companySubscriptions).values(subscriptionData);
        logger.info(`Added company subscriptions`);

        // Sample payment transactions
        const paymentData: PaymentTransactionData[] = [
            {
                id: createId(),
                companyId: companyData[0].id,
                subscriptionId: subscriptionData[0].id,
                amount: '24990',
                currency: 'INR',
                paymentMethod: 'credit_card',
                transactionId: 'TXN123456789',
                referenceNumber: 'REF123456789',
                status: 'completed',
                paymentGateway: 'razorpay',
                gatewayResponse: JSON.stringify({
                    status: 'success',
                    paymentId: 'pay_123456789',
                    method: 'card'
                }),
                invoiceNumber: 'INV-001-2024',
                receiptUrl: 'https://example.com/receipts/INV-001-2024.pdf'
            },
            {
                id: createId(),
                companyId: companyData[1].id,
                subscriptionId: subscriptionData[1].id,
                amount: '9990',
                currency: 'INR',
                paymentMethod: 'bank_transfer',
                transactionId: 'TXN987654321',
                referenceNumber: 'REF987654321',
                status: 'completed',
                paymentGateway: 'razorpay',
                gatewayResponse: JSON.stringify({
                    status: 'success',
                    paymentId: 'pay_987654321',
                    method: 'netbanking'
                }),
                invoiceNumber: 'INV-002-2024',
                receiptUrl: 'https://example.com/receipts/INV-002-2024.pdf'
            }
        ];

        // Insert payment transactions
        await db.insert(paymentTransactions).values(paymentData);
        logger.info(`Added payment transactions`);

        // Read vehicle data from CSV
        const vehicleCSVData = readCSV<CSVVehicleData>('vehicles.csv');
        const vehiclesPerCompany = 5; // Number of vehicles to create per company

        // If CSV data is available, use it
        let vehicleData: VehicleData[] = [];

        if (vehicleCSVData.length > 0) {
            // Use CSV data
            vehicleData = vehicleCSVData.slice(0, companyData.length * vehiclesPerCompany)
                .map((v: CSVVehicleData, index: number) => ({
                    id: createId(),
                    companyId: companyData[Math.floor(index / vehiclesPerCompany)].id,
                    registrationNumber: v.registrationNumber,
                    chassisNumber: v.chassisNumber || `CH${Math.floor(Math.random() * 1000000)}`,
                    engineNumber: v.engineNumber || `EN${Math.floor(Math.random() * 1000000)}`,
                    vehicleClass: v.vehicleClass || 'Goods Carrier',
                    vehicleCategory: v.vehicleCategory || 'Commercial',
                    maker: v.maker || 'TATA MOTORS LTD',
                    model: v.model || 'TATA 407',
                    manufacturedDate: v.manufacturedDate ? new Date(v.manufacturedDate) : new Date('2020-01-01'),
                    fuelType: v.fuelType || 'DIESEL',
                    fuelNorms: v.fuelNorms || 'BHARAT STAGE IV',
                    vehicleColor: v.vehicleColor || 'WHITE',
                    bodyType: v.bodyType || 'CLOSED BODY',
                    status: 'active'
                }));
        } else {
            // Generate sample vehicle data
            for (let i = 0; i < companyData.length; i++) {
                const companyId = companyData[i].id;

                for (let j = 0; j < vehiclesPerCompany; j++) {
                    const regState = i === 0 ? 'MH' : 'DL';
                    const regIndex = j + 1;

                    vehicleData.push({
                        id: createId(),
                        companyId: companyId,
                        registrationNumber: `${regState}01AB${(1000 + regIndex).toString().slice(1)}`,
                        chassisNumber: `CH${i}${j}${Math.floor(Math.random() * 10000)}`,
                        engineNumber: `EN${i}${j}${Math.floor(Math.random() * 10000)}`,
                        vehicleClass: j % 2 === 0 ? 'Goods Carrier' : 'Passenger Vehicle',
                        vehicleCategory: 'Commercial',
                        maker: ['TATA MOTORS', 'ASHOK LEYLAND', 'MAHINDRA', 'EICHER'][j % 4],
                        model: `Model ${100 + j}`,
                        manufacturedDate: new Date(`202${j % 3}-01-01`),
                        fuelType: j % 3 === 0 ? 'DIESEL' : (j % 3 === 1 ? 'PETROL' : 'CNG'),
                        fuelNorms: 'BHARAT STAGE IV',
                        vehicleColor: ['WHITE', 'BLUE', 'RED', 'SILVER', 'BLACK'][j % 5],
                        bodyType: j % 2 === 0 ? 'CLOSED BODY' : 'OPEN BODY',
                        status: 'active'
                    });
                }
            }
        }

        // Insert vehicles
        await db.insert(vehicles).values(vehicleData);
        logger.info(`Added ${vehicleData.length} vehicles`);

        // Create vehicle owners
        const ownerData: VehicleOwnerData[] = vehicleData.map((vehicle: VehicleData) => ({
            id: createId(),
            vehicleId: vehicle.id,
            ownerName: `Owner of ${vehicle.registrationNumber}`,
            fatherName: 'Father\'s Name',
            permanentAddress: '123 Permanent Address, City, State',
            presentAddress: '123 Present Address, City, State',
            mobileNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
            ownerSerialNumber: 1,
            isCurrent: true
        }));

        await db.insert(vehicleOwners).values(ownerData);
        logger.info(`Added vehicle owners`);

        // Create vehicle compliance data
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const complianceData: VehicleComplianceData[] = vehicleData.map((vehicle: VehicleData) => {
            // Add some variety to expiry dates
            const fitnessFuture = Math.random() > 0.2; // 80% vehicles have future fitness dates
            const insuranceFuture = Math.random() > 0.1; // 90% vehicles have future insurance dates
            const pucFuture = Math.random() > 0.3; // 70% vehicles have future PUC dates

            return {
                id: createId(),
                vehicleId: vehicle.id,

                // Registration details
                registrationDate: getRandomPastDate(12, 36),
                registrationValidUntil: getRandomFutureDate(12, 48),
                registrationRto: vehicle.registrationNumber.substring(0, 4),
                registrationState: vehicle.registrationNumber.substring(0, 2) === 'MH' ? 'Maharashtra' : 'Delhi',
                registrationStatus: 'ACTIVE',

                // Compliance dates - mix of future and expired
                fitnessValidUntil: fitnessFuture ? getRandomFutureDate(1, 12) : getRandomPastDate(1, 3),
                taxValidUntil: getRandomFutureDate(3, 15),
                insuranceValidUntil: insuranceFuture ? getRandomFutureDate(1, 15) : getRandomPastDate(1, 2),
                pucValidUntil: pucFuture ? getRandomFutureDate(1, 6) : getRandomPastDate(1, 4),

                // Insurance details
                insuranceProvider: ['ICICI Lombard', 'HDFC ERGO', 'Bajaj Allianz', 'New India Assurance'][Math.floor(Math.random() * 4)],
                insurancePolicyNumber: `POLICY-${Math.floor(1000000 + Math.random() * 9000000)}`,

                // Permit details
                permitType: 'NATIONAL PERMIT',
                permitNumber: `PER-${Math.floor(10000 + Math.random() * 90000)}`,
                permitIssueDate: getRandomPastDate(6, 24),
                permitValidFrom: getRandomPastDate(6, 24),
                permitValidUntil: getRandomFutureDate(6, 24),

                // Other details
                financerDetails: Math.random() > 0.3 ? ['HDFC Bank', 'ICICI Bank', 'SBI', 'Kotak Mahindra'][Math.floor(Math.random() * 4)] : undefined,
            };
        });

        await db.insert(vehicleCompliance).values(complianceData);
        logger.info(`Added vehicle compliance data`);

        // Create sample challans
        const challanData: ChallanData[] = [];
        const offenceData: ChallanOffenceData[] = [];

        // Read challan data from CSV if available
        const challanCSVData = readCSV<CSVChallanData>('challans.csv');

        const challanCountPerVehicle = 2; // Number of challans per vehicle

        let vehiclesToGetChallans: VehicleData[] = vehicleData.filter(() => Math.random() > 0.3); // Only 70% of vehicles get challans

        if (challanCSVData.length > 0) {
            // Use CSV data if available
            const csvChallans = challanCSVData.slice(0, vehiclesToGetChallans.length * challanCountPerVehicle);

            vehiclesToGetChallans.forEach((vehicle: VehicleData, vIndex: number) => {
                for (let i = 0; i < challanCountPerVehicle && vIndex * challanCountPerVehicle + i < csvChallans.length; i++) {
                    const csvChallan = csvChallans[vIndex * challanCountPerVehicle + i];

                    const challanId = createId();
                    const challanStatus = csvChallan.challanStatus || (Math.random() > 0.5 ? 'pending' : 'disposed');

                    challanData.push({
                        id: challanId,
                        vehicleId: vehicle.id,
                        challanNumber: csvChallan.challanNumber || `CHL-${Math.floor(100000 + Math.random() * 900000)}`,
                        challanDate: new Date(csvChallan.challanDate || getRandomPastDate(1, 12)),
                        challanAmount: String(csvChallan.challanAmount || (500 + Math.floor(Math.random() * 2000))),
                        challanStatus: challanStatus,
                        challanPaymentDate: challanStatus === 'disposed' ? new Date(getRandomPastDate(0, 6)) : null,
                        violatorName: csvChallan.violatorName || `Driver of ${vehicle.registrationNumber}`,
                        transactionId: challanStatus === 'disposed' ? `TXN-${Math.floor(10000 + Math.random() * 90000)}` : null,
                        state: vehicle.registrationNumber.substring(0, 2),
                        isNotified: true,
                    });

                    // Create offences for this challan
                    const offenceCount = 1 + Math.floor(Math.random() * 2); // 1-2 offences per challan
                    for (let j = 0; j < offenceCount; j++) {
                        offenceData.push({
                            id: createId(),
                            challanId: challanId,
                            externalId: `EXT-${Math.floor(10000 + Math.random() * 90000)}`,
                            externalChallanId: `EXTC-${Math.floor(10000 + Math.random() * 90000)}`,
                            offenceName: [
                                'Driving without license',
                                'Over speeding',
                                'Driving without helmet',
                                'Driving without insurance',
                                'Jumping red light',
                                'Driving without PUC',
                                'Parking violation'
                            ][Math.floor(Math.random() * 7)],
                            mvaSection: `Section ${100 + Math.floor(Math.random() * 100)} of MV Act`,
                            penaltyAmount: String(500 * (j + 1))
                        });
                    }
                }
            });
        } else {
            // Generate sample challans
            vehiclesToGetChallans.forEach((vehicle: VehicleData) => {
                for (let i = 0; i < challanCountPerVehicle; i++) {
                    const challanId = createId();
                    const isPending = Math.random() > 0.5;

                    challanData.push({
                        id: challanId,
                        vehicleId: vehicle.id,
                        challanNumber: `CHL-${Math.floor(100000 + Math.random() * 900000)}`,
                        challanDate: new Date(getRandomPastDate(1, 12)),
                        challanAmount: String(500 + Math.floor(Math.random() * 2000)),
                        challanStatus: isPending ? 'pending' : 'disposed',
                        challanPaymentDate: isPending ? null : new Date(getRandomPastDate(0, 6)),
                        violatorName: `Driver of ${vehicle.registrationNumber}`,
                        transactionId: isPending ? null : `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
                        state: vehicle.registrationNumber.substring(0, 2),
                        isNotified: true,
                    });

                    // Create offences for this challan
                    const offenceCount = 1 + Math.floor(Math.random() * 2); // 1-2 offences per challan
                    for (let j = 0; j < offenceCount; j++) {
                        offenceData.push({
                            id: createId(),
                            challanId: challanId,
                            externalId: `EXT-${Math.floor(10000 + Math.random() * 90000)}`,
                            externalChallanId: `EXTC-${Math.floor(10000 + Math.random() * 90000)}`,
                            offenceName: [
                                'Driving without license',
                                'Over speeding',
                                'Driving without helmet',
                                'Driving without insurance',
                                'Jumping red light',
                                'Driving without PUC',
                                'Parking violation'
                            ][Math.floor(Math.random() * 7)],
                            mvaSection: `Section ${100 + Math.floor(Math.random() * 100)} of MV Act`,
                            penaltyAmount: String(500 * (j + 1))
                        });
                    }
                }
            });
        }

        await db.insert(challans).values(challanData);
        logger.info(`Added ${challanData.length} challans`);

        await db.insert(challanOffences).values(offenceData);
        logger.info(`Added ${offenceData.length} challan offences`);

        // Create sample notifications
        const notificationData: NotificationData[] = [];

        // Challan notifications
        challanData.forEach((challan: ChallanData) => {
            const vehicle = vehicleData.find(v => v.id === challan.vehicleId);
            const company = vehicle ? companyData.find(c => c.id === vehicle.companyId) : null;
            const user = company ? userData.find(u => u.companyId === company.id) : null;

            notificationData.push({
                id: createId(),
                companyId: vehicle?.companyId || companyData[0].id,
                vehicleId: challan.vehicleId,
                userId: user?.id,
                title: `New Challan for ${vehicle?.registrationNumber}`,
                message: `A new challan of Rs. ${challan.challanAmount} has been issued for your vehicle on ${new Date(challan.challanDate).toLocaleDateString()}`,
                notificationType: 'challan',
                referenceId: challan.id,
                severity: 'warning',
                isRead: Math.random() > 0.5,
                emailStatus: 'sent',
                smsStatus: 'sent',
                pushStatus: 'sent',
                createdAt: new Date(challan.challanDate)
            });
        });

        // Expiry notifications
        complianceData.forEach((compliance: VehicleComplianceData) => {
            const vehicle = vehicleData.find(v => v.id === compliance.vehicleId);
            const company = vehicle ? companyData.find(c => c.id === vehicle.companyId) : null;
            const user = company ? userData.find(u => u.companyId === company.id) : null;

            if (compliance.insuranceValidUntil && new Date(compliance.insuranceValidUntil) < new Date()) {
                notificationData.push({
                    id: createId(),
                    companyId: vehicle?.companyId || companyData[0].id,
                    vehicleId: compliance.vehicleId,
                    userId: user?.id,
                    title: `Insurance Expired for ${vehicle?.registrationNumber}`,
                    message: `The insurance for your vehicle has expired on ${new Date(compliance.insuranceValidUntil).toLocaleDateString()}. Please renew it as soon as possible.`,
                    notificationType: 'insurance_expiry',
                    referenceId: compliance.id,
                    severity: 'critical',
                    isRead: Math.random() > 0.7,
                    emailStatus: 'sent',
                    smsStatus: 'sent',
                    pushStatus: 'sent',
                    createdAt: new Date(compliance.insuranceValidUntil)
                });
            }

            if (compliance.pucValidUntil && new Date(compliance.pucValidUntil) < new Date()) {
                notificationData.push({
                    id: createId(),
                    companyId: vehicle?.companyId || companyData[0].id,
                    vehicleId: compliance.vehicleId,
                    userId: user?.id,
                    title: `PUC Expired for ${vehicle?.registrationNumber}`,
                    message: `The PUC certificate for your vehicle has expired on ${new Date(compliance.pucValidUntil).toLocaleDateString()}. Please renew it immediately to avoid penalties.`,
                    notificationType: 'puc_expiry',
                    referenceId: compliance.id,
                    severity: 'critical',
                    isRead: Math.random() > 0.6,
                    emailStatus: 'sent',
                    smsStatus: 'sent',
                    pushStatus: 'sent',
                    createdAt: new Date(compliance.pucValidUntil)
                });
            }

            if (compliance.fitnessValidUntil && new Date(compliance.fitnessValidUntil) < new Date()) {
                notificationData.push({
                    id: createId(),
                    companyId: vehicle?.companyId || companyData[0].id,
                    vehicleId: compliance.vehicleId,
                    userId: user?.id,
                    title: `Fitness Certificate Expired for ${vehicle?.registrationNumber}`,
                    message: `The fitness certificate for your vehicle has expired on ${new Date(compliance.fitnessValidUntil).toLocaleDateString()}. Please get your vehicle inspected immediately.`,
                    notificationType: 'fitness_expiry',
                    referenceId: compliance.id,
                    severity: 'critical',
                    isRead: Math.random() > 0.5,
                    emailStatus: 'sent',
                    smsStatus: 'sent',
                    pushStatus: 'sent',
                    createdAt: new Date(compliance.fitnessValidUntil)
                });
            }
        });

        await db.insert(notifications).values(notificationData);
        logger.info(`Added ${notificationData.length} notifications`);

        // Create sample driver licenses
        // Create sample driver licenses
        const driverData: DriverLicenseData[] = [];
        const driverAssignments: VehicleDriverAssignmentData[] = [];

        for (let i = 0; i < companyData.length; i++) {
            for (let j = 0; j < 3; j++) { // 3 drivers per company
                const licenseId = createId();
                const licenseState = i === 0 ? 'MH' : 'DL';

                driverData.push({
                    id: licenseId,
                    companyId: companyData[i].id,
                    licenseNumber: `${licenseState}${20220000 + j + i * 10}`,
                    name: `Driver ${i + 1}-${j + 1}`,
                    dob: new Date(`198${j + 1}-01-01`),
                    gender: Math.random() > 0.2 ? 'Male' : 'Female',
                    bloodGroup: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
                    currentStatus: 'ACTIVE',
                    dateOfIssue: new Date(`201${j + 5}-01-01`),
                    nonTransportValidFrom: new Date(`201${j + 5}-01-01`),
                    nonTransportValidUntil: new Date(`203${j + 5}-01-01`),
                    transportValidFrom: new Date(`201${j + 5}-01-01`),
                    transportValidUntil: new Date(`202${j + 5}-01-01`),
                    vehicleClasses: JSON.stringify(['LMV', 'MCWG', 'TRANS']),
                    issuingAuthority: `RTO ${licenseState}`
                });

                // Just store the assignment for later
                if (vehicleData[i * vehiclesPerCompany + j]) {
                    driverAssignments.push({
                        id: createId(),
                        vehicleId: vehicleData[i * vehiclesPerCompany + j].id,
                        driverLicenseId: licenseId,
                        startDate: new Date(`2023-0${j + 1}-01`),
                        isPrimary: true,
                        status: 'active'
                    });
                }
            }
        }

        // Insert all driver licenses first
        await db.insert(driverLicenses).values(driverData);
        logger.info(`Added ${driverData.length} driver licenses`);

        // Then insert all driver assignments
        if (driverAssignments.length > 0) {
            await db.insert(vehicleDriverAssignments).values(driverAssignments);
            logger.info(`Added ${driverAssignments.length} driver assignments`);
        }
        logger.info('Data import complete!');

        return true;
    } catch (err: any) {
        logger.error(`Error during import: ${err.message}`);
        console.error(err.stack);
        return false;
    } finally {
        await closeDB();
    }
};

// Delete data
const deleteData = async (shouldDisconnect = true): Promise<boolean> => {
    try {
        if (shouldDisconnect) {
            await connectDB();
            logger.info('Connected to database for data deletion');
        }

        // Delete all data in reverse order of dependencies
        try { await db.delete(challanOffences); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(challans); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(vehicleDriverAssignments); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(driverLicenses); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(vehicleCompliance); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(vehicleOwners); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(vehicles); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(notifications); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(userNotificationSettings); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(paymentTransactions); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(companySubscriptions); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(subscriptionPlans); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(users); } catch (err) { /* ignore errors if table doesn't exist */ }
        try { await db.delete(companies); } catch (err) { /* ignore errors if table doesn't exist */ }

        logger.info('All data has been deleted!');
        return true;
    } catch (err: any) {
        logger.error(`Error during deletion: ${err.message}`);
        console.error(err.stack);
        return false;
    } finally {
        if (shouldDisconnect) {
            await closeDB();
        }
    }
};


// Command line arguments
const runScript = async (): Promise<void> => {
    const arg = process.argv[2];

    if (arg === '-d') {
        const deleteSuccess = await deleteData();
        process.exit(deleteSuccess ? 0 : 1);
    } else if (arg === '-i') {
        const importSuccess = await importData();
        process.exit(importSuccess ? 0 : 1);
    } else {
        console.log(`
Usage:
  Delete data: npm run seed:delete
    `);
        process.exit(0);
    }
};

// Run the script if called directly
if (require.main === module) {
    runScript().catch((error: Error) => {
        logger.error(`Unhandled error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    });
}

export { deleteData, importData };

