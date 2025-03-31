// src/controllers/vehicleController.ts
import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { db } from '../config/db';
import asyncHandler from '../middlewares/asyncHandler';
import { challanOffences, challans } from '../models/schemas/challans';
import { vehicleCompliance } from '../models/schemas/compliance';
import { auditLogs } from '../models/schemas/logs';
import { vehicleOwners, vehicles } from '../models/schemas/vehicles';
import { checkVehicleChallans, getVehicleRcDetails } from '../services/externalApiService';
import ErrorResponse from '../utils/errorResponse';

/**
 * @desc    Create a new vehicle
 * @route   POST /api/vehicles
 * @access  Private
 */
export const createVehicle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
        registrationNumber,
        chassisNumber,
        engineNumber,
        vehicleClass,
        vehicleCategory,
        maker,
        model,
        manufacturedDate,
        fuelType,
        ownerName,
        ownerFatherName,
        permanentAddress,
        mobileNumber
    } = req.body;

    const companyId = req.user.companyId;

    // Check if vehicle already exists
    const existingVehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.registrationNumber, registrationNumber)
    });

    if (existingVehicle) {
        return next(new ErrorResponse('Vehicle with this registration number already exists', 400));
    }

    const vehicleId = createId();

    // Begin transaction
    await db.transaction(async (tx) => {
        // Create vehicle
        await tx.insert(vehicles).values({
            id: vehicleId,
            companyId,
            registrationNumber,
            chassisNumber: chassisNumber || null,
            engineNumber: engineNumber || null,
            vehicleClass: vehicleClass || null,
            vehicleCategory: vehicleCategory || null,
            maker: maker || null,
            model: model || null,
            manufacturedDate: manufacturedDate ? new Date(manufacturedDate) : null,
            fuelType: fuelType || null
        });

        // Create vehicle owner if provided
        if (ownerName) {
            await tx.insert(vehicleOwners).values({
                id: createId(),
                vehicleId,
                ownerName,
                fatherName: ownerFatherName || null,
                permanentAddress: permanentAddress || null,
                mobileNumber: mobileNumber || null,
                isCurrent: true
            });
        }

        // Create empty compliance record
        await tx.insert(vehicleCompliance).values({
            id: createId(),
            vehicleId
        });

        // Log audit
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId: req.user.id,
            action: 'CREATE',
            entityType: 'VEHICLE',
            entityId: vehicleId,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
    });

    // Get created vehicle with relations
    const vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId),
        with: {
            owners: true,
            compliance: true
        }
    });

    res.status(201).json({
        success: true,
        data: vehicle
    });
});

/**
 * @desc    Get all vehicles for a company
 * @route   GET /api/vehicles
 * @access  Private
 */
export const getVehicles = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user.companyId;

    const allVehicles = await db.query.vehicles.findMany({
        where: eq(vehicles.companyId, companyId),
        with: {
            owners: {
                where: eq(vehicleOwners.isCurrent, true)
            },
            compliance: true
        }
    });

    res.status(200).json({
        success: true,
        count: allVehicles.length,
        data: allVehicles
    });
});

/**
 * @desc    Get single vehicle
 * @route   GET /api/vehicles/:id
 * @access  Private
 */
export const getVehicle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = req.params.id;
    const companyId = req.user.companyId;

    const vehicle = await db.query.vehicles.findFirst({
        where: and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.companyId, companyId)
        ),
        with: {
            owners: true,
            compliance: true,
            challans: {
                with: {
                    offences: true
                }
            }
        }
    });

    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    res.status(200).json({
        success: true,
        data: vehicle
    });
});

/**
 * @desc    Update vehicle
 * @route   PUT /api/vehicles/:id
 * @access  Private
 */
export const updateVehicle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = req.params.id;
    const companyId = req.user.companyId;

    // Find vehicle to update
    const vehicle = await db.query.vehicles.findFirst({
        where: and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.companyId, companyId)
        )
    });

    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    // Get the existing data for audit log
    const oldValues = { ...vehicle };

    // Update the vehicle
    await db.transaction(async (tx) => {
        await tx.update(vehicles)
            .set({
                ...req.body,
                updatedAt: new Date(),
                // Ensure these fields can't be changed
                id: undefined,
                companyId: undefined,
                registrationNumber: undefined,
                createdAt: undefined
            })
            .where(eq(vehicles.id, vehicleId));

        // Log audit
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId: req.user.id,
            action: 'UPDATE',
            entityType: 'VEHICLE',
            entityId: vehicleId,
            oldValues,
            newValues: req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
    });

    // Get updated vehicle
    const updatedVehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId),
        with: {
            owners: true,
            compliance: true
        }
    });

    res.status(200).json({
        success: true,
        data: updatedVehicle
    });
});

/**
 * @desc    Delete vehicle
 * @route   DELETE /api/vehicles/:id
 * @access  Private
 */
export const deleteVehicle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = req.params.id;
    const companyId = req.user.companyId;

    // Find vehicle to delete
    const vehicle = await db.query.vehicles.findFirst({
        where: and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.companyId, companyId)
        ),
        with: {
            owners: true,
            compliance: true,
            challans: true
        }
    });

    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    // Delete the vehicle and related entities
    await db.transaction(async (tx) => {
        // Log audit before deletion
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId: req.user.id,
            action: 'DELETE',
            entityType: 'VEHICLE',
            entityId: vehicleId,
            oldValues: vehicle,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });

        // Delete the vehicle (cascade should take care of related entities)
        await tx.delete(vehicles).where(eq(vehicles.id, vehicleId));
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});

/**
 * @desc    Check vehicle challans from external API
 * @route   POST /api/vehicles/:id/check-challans
 * @access  Private
 */
export const checkVehicleChallanStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = req.params.id;
    const companyId = req.user.companyId;

    // Find vehicle
    const vehicle = await db.query.vehicles.findFirst({
        where: and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.companyId, companyId)
        )
    });

    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    // Call external API to check challans
    const challanData = await checkVehicleChallans(companyId, vehicle.registrationNumber);

    if (!challanData.data || challanData.data.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No challans found for this vehicle',
            data: []
        });
    }

    // Process and save challan data
    const savedChallans = await db.transaction(async (tx) => {
        const savedItems = [];

        for (const challanItem of challanData.data) {
            // Skip if challan already exists
            const existingChallan = await db.query.challans.findFirst({
                where: eq(challans.challanNumber, challanItem.challanNo)
            });

            if (existingChallan) {
                savedItems.push({
                    ...existingChallan,
                    alreadyExists: true
                });
                continue;
            }

            // Create new challan
            const challanId = createId();

            await tx.insert(challans).values({
                id: challanId,
                vehicleId,
                challanNumber: challanItem.challanNo,
                challanDate: new Date(challanItem.challanDate),
                challanAmount: parseFloat(challanItem.amount),
                challanStatus: challanItem.challanStatus,
                challanPaymentDate: challanItem.challanStatus === 'Paid' ? new Date() : null,
                violatorName: challanItem.accusedName,
                paymentSource: '',
                state: challanItem.state,
                challanUrl: '',
                receiptUrl: '',
                paymentUrl: challanItem.paymentUrl,
                isNotified: false,
                apiResponseData: challanItem,
                lastApiSync: new Date()
            });

            // Create challan offense
            await tx.insert(challanOffences).values({
                id: createId(),
                challanId,
                externalId: '',
                externalChallanId: challanItem.challanNo,
                offenceName: challanItem.offenseDetails,
                mvaSection: '',
                penaltyAmount: parseFloat(challanItem.amount)
            });

            // Get the saved challan with offense
            const savedChallan = {
                id: challanId,
                challanNumber: challanItem.challanNo,
                challanDate: new Date(challanItem.challanDate),
                challanAmount: parseFloat(challanItem.amount),
                challanStatus: challanItem.challanStatus,
                alreadyExists: false
            };

            savedItems.push(savedChallan);
        }

        // Update vehicle last API sync time
        await tx.update(vehicles)
            .set({ lastApiSync: new Date() })
            .where(eq(vehicles.id, vehicleId));

        return savedItems;
    });

    res.status(200).json({
        success: true,
        message: 'Challans checked and saved successfully',
        count: savedChallans.length,
        data: savedChallans
    });
});

/**
 * @desc    Fetch and update vehicle RC details from external API
 * @route   POST /api/vehicles/:id/fetch-rc-details
 * @access  Private
 */
export const fetchVehicleRcDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = req.params.id;
    const companyId = req.user.companyId;

    // Find vehicle
    const vehicle = await db.query.vehicles.findFirst({
        where: and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.companyId, companyId)
        ),
        with: {
            compliance: true,
            owners: true
        }
    });

    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }

    // Call external API to get RC details
    const rcData = await getVehicleRcDetails(companyId, vehicle.registrationNumber);

    if (!rcData.success) {
        return next(new ErrorResponse('Failed to fetch RC details', 400));
    }

    // Process and save RC data
    const updatedData = await db.transaction(async (tx) => {
        const data = rcData.data;

        // Update vehicle details
        await tx.update(vehicles)
            .set({
                chassisNumber: data.chassis_number || vehicle.chassisNumber,
                engineNumber: data.engine_number || vehicle.engineNumber,
                vehicleClass: data.vehicle_class || vehicle.vehicleClass,
                vehicleCategory: data.vehicle_category || vehicle.vehicleCategory,
                maker: data.maker || vehicle.maker,
                model: data.model || vehicle.model,
                manufacturedDate: data.manufactured_date ? new Date(data.manufactured_date) : vehicle.manufacturedDate,
                fuelType: data.fuel_type || vehicle.fuelType,
                fuelNorms: data.fuel_norms || vehicle.fuelNorms,
                vehicleColor: data.color || vehicle.vehicleColor,
                bodyType: data.body_type || vehicle.bodyType,
                unladenWeight: data.unladen_weight || vehicle.unladenWeight,
                grossWeight: data.gross_weight || vehicle.grossWeight,
                numberOfCylinders: data.cylinders || vehicle.numberOfCylinders,
                cubicCapacity: data.cubic_capacity || vehicle.cubicCapacity,
                seatingCapacity: data.seating_capacity || vehicle.seatingCapacity,
                lastApiSync: new Date()
            })
            .where(eq(vehicles.id, vehicleId));

        // Update vehicle owner if exists and current owner info is different
        if (data.owner_name) {
            const currentOwner = vehicle.owners.find(o => o.isCurrent);

            if (currentOwner && currentOwner.ownerName !== data.owner_name) {
                // Set existing owner as not current
                await tx.update(vehicleOwners)
                    .set({ isCurrent: false })
                    .where(eq(vehicleOwners.id, currentOwner.id));

                // Create new owner
                await tx.insert(vehicleOwners).values({
                    id: createId(),
                    vehicleId,
                    ownerName: data.owner_name,
                    fatherName: data.father_name || null,
                    permanentAddress: data.permanent_address || null,
                    presentAddress: data.present_address || null,
                    mobileNumber: data.mobile_number || null,
                    isCurrent: true
                });
            } else if (!currentOwner) {
                // Create new owner if none exists
                await tx.insert(vehicleOwners).values({
                    id: createId(),
                    vehicleId,
                    ownerName: data.owner_name,
                    fatherName: data.father_name || null,
                    permanentAddress: data.permanent_address || null,
                    presentAddress: data.present_address || null,
                    mobileNumber: data.mobile_number || null,
                    isCurrent: true
                });
            }
        }

        // Update compliance data
        await tx.update(vehicleCompliance)
            .set({
                registrationDate: data.registration_date ? new Date(data.registration_date) : vehicle.compliance.registrationDate,
                registrationValidUntil: data.registration_valid_until ? new Date(data.registration_valid_until) : vehicle.compliance.registrationValidUntil,
                registrationRto: data.registration_rto || vehicle.compliance.registrationRto,
                registrationState: data.registration_state || vehicle.compliance.registrationState,
                registrationStatus: data.registration_status || vehicle.compliance.registrationStatus,

                fitnessValidUntil: data.fitness_valid_until ? new Date(data.fitness_valid_until) : vehicle.compliance.fitnessValidUntil,
                taxValidUntil: data.tax_valid_until ? new Date(data.tax_valid_until) : vehicle.compliance.taxValidUntil,
                insuranceValidUntil: data.insurance_valid_until ? new Date(data.insurance_valid_until) : vehicle.compliance.insuranceValidUntil,
                pucValidUntil: data.puc_valid_until ? new Date(data.puc_valid_until) : vehicle.compliance.pucValidUntil,

                insuranceProvider: data.insurance_provider || vehicle.compliance.insuranceProvider,
                insurancePolicyNumber: data.insurance_policy_number || vehicle.compliance.insurancePolicyNumber,

                permitType: data.permit_type || vehicle.compliance.permitType,
                permitNumber: data.permit_number || vehicle.compliance.permitNumber,
                permitIssueDate: data.permit_issue_date ? new Date(data.permit_issue_date) : vehicle.compliance.permitIssueDate,
                permitValidFrom: data.permit_valid_from ? new Date(data.permit_valid_from) : vehicle.compliance.permitValidFrom,
                permitValidUntil: data.permit_valid_until ? new Date(data.permit_valid_until) : vehicle.compliance.permitValidUntil,

                financerDetails: data.financer_details || vehicle.compliance.financerDetails,
                blacklistStatus: data.blacklist_status || vehicle.compliance.blacklistStatus,

                lastApiSync: new Date()
            })
            .where(eq(vehicleCompliance.vehicleId, vehicleId));

        // Log audit
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId: req.user.id,
            action: 'API_UPDATE',
            entityType: 'VEHICLE',
            entityId: vehicleId,
            oldValues: vehicle,
            newValues: rcData.data,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
    });

    // Get updated vehicle
    const updatedVehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, vehicleId),
        with: {
            owners: true,
            compliance: true
        }
    });

    res.status(200).json({
        success: true,
        message: 'Vehicle RC details updated successfully',
        data: updatedVehicle
    });
});