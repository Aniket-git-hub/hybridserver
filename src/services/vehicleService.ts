import { eq } from 'drizzle-orm';

import { db } from '../config/db';

import { vehicles, vehicleOwners, vehicleCompliance } from '../models';

import { VehicleStatus } from '../models/types/enums';

import { eventEmitter } from '../events/eventEmitter';

import { EventType, createEventPayload } from '../events/eventTypes';



export interface CreateVehicleData {

    companyId: string;

    registrationNumber: string;

    chassisNumber?: string;

    engineNumber?: string;

    vehicleClass?: string;

    vehicleCategory?: string;

    maker?: string;

    model?: string;

    manufacturedDate?: Date;

    fuelType?: string;

    fuelNorms?: string;

    vehicleColor?: string;

    bodyType?: string;

    // Technical specifications

    unladenWeight?: number;

    grossWeight?: number;

    numberOfCylinders?: number;

    cubicCapacity?: number;

    seatingCapacity?: number;

    standingCapacity?: number;

    sleeperCapacity?: number;

    wheelBase?: number;

    // Owner information

    ownerName: string;

    fatherName?: string;

    permanentAddress?: string;

    presentAddress?: string;

    mobileNumber?: string;

    // Compliance information (optional on creation)

    registrationDate?: Date;

    registrationValidUntil?: Date;

    fitnessValidUntil?: Date;

    insuranceValidUntil?: Date;

    insuranceProvider?: string;

    insurancePolicyNumber?: string;

    permitType?: string;

    permitNumber?: string;

    permitValidUntil?: Date;

}



export interface UpdateVehicleData {

    // Only include fields that can be updated

    registrationNumber?: string;

    vehicleClass?: string;

    vehicleCategory?: string;

    maker?: string;

    model?: string;

    fuelType?: string;

    fuelNorms?: string;

    vehicleColor?: string;

    bodyType?: string;

    // Technical specifications

    unladenWeight?: number;

    grossWeight?: number;

    numberOfCylinders?: number;

    cubicCapacity?: number;

    seatingCapacity?: number;

    standingCapacity?: number;

    sleeperCapacity?: number;

    wheelBase?: number;

    status?: VehicleStatus;

}



class VehicleService {

    /**
  
     * Create a new vehicle with owner and compliance info
  
     */

    async createVehicle(data: CreateVehicleData) {

        return await db.transaction(async (tx) => {

            // First, create the vehicle

            const [vehicle] = await tx.insert(vehicles).values({

                companyId: data.companyId,

                registrationNumber: data.registrationNumber,

                chassisNumber: data.chassisNumber,

                engineNumber: data.engineNumber,

                vehicleClass: data.vehicleClass,

                vehicleCategory: data.vehicleCategory,

                maker: data.maker,

                model: data.model,

                manufacturedDate: data.manufacturedDate ? new Date(data.manufacturedDate) : undefined,

                fuelType: data.fuelType,

                fuelNorms: data.fuelNorms,

                vehicleColor: data.vehicleColor,

                bodyType: data.bodyType,

                unladenWeight: data.unladenWeight,

                grossWeight: data.grossWeight,

                numberOfCylinders: data.numberOfCylinders,

                cubicCapacity: data.cubicCapacity,

                seatingCapacity: data.seatingCapacity,

                standingCapacity: data.standingCapacity,

                sleeperCapacity: data.sleeperCapacity,

                wheelBase: data.wheelBase,

                status: VehicleStatus.ACTIVE

            }).returning();



            // Next, create the owner information

            const [owner] = await tx.insert(vehicleOwners).values({

                vehicleId: vehicle.id,

                ownerName: data.ownerName,

                fatherName: data.fatherName,

                permanentAddress: data.permanentAddress,

                presentAddress: data.presentAddress,

                mobileNumber: data.mobileNumber,

                ownerSerialNumber: 1, // First owner

                isCurrent: true

            }).returning();



            // Finally, create compliance information if provided

            let compliance;

            if (data.registrationDate || data.registrationValidUntil || data.fitnessValidUntil ||

                data.insuranceValidUntil || data.permitValidUntil) {



                [compliance] = await tx.insert(vehicleCompliance).values({

                    vehicleId: vehicle.id,

                    registrationDate: data.registrationDate ? new Date(data.registrationDate) : undefined,

                    registrationValidUntil: data.registrationValidUntil ? new Date(data.registrationValidUntil) : undefined,

                    fitnessValidUntil: data.fitnessValidUntil ? new Date(data.fitnessValidUntil) : undefined,

                    insuranceValidUntil: data.insuranceValidUntil ? new Date(data.insuranceValidUntil) : undefined,

                    insuranceProvider: data.insuranceProvider,

                    insurancePolicyNumber: data.insurancePolicyNumber,

                    permitType: data.permitType,

                    permitNumber: data.permitNumber,

                    permitValidUntil: data.permitValidUntil ? new Date(data.permitValidUntil) : undefined,

                }).returning();

            }



            // Emit vehicle created event

            eventEmitter.emit(

                EventType.VEHICLE_CREATED,

                createEventPayload({

                    vehicleId: vehicle.id,

                    companyId: data.companyId,

                    data: vehicle

                })

            );



            // Return complete vehicle data

            return {

                vehicle,

                owner,

                compliance

            };

        });

    }



    /**
  
     * Get vehicle by ID with related data
  
     */

    async getVehicleById(vehicleId: string, withRelations: boolean = true) {

        // Get the vehicle

        const [vehicle] = await db

            .select()

            .from(vehicles)

            .where(eq(vehicles.id, vehicleId));



        if (!vehicle) {

            throw new Error('Vehicle not found');

        }



        // If we don't need relations, return just the vehicle

        if (!withRelations) {

            return { vehicle };

        }



        // Get owner information

        const [owner] = await db

            .select()

            .from(vehicleOwners)

            .where(

                eq(vehicleOwners.vehicleId, vehicleId),

                eq(vehicleOwners.isCurrent, true)

            );



        // Get compliance information

        const [compliance] = await db

            .select()

            .from(vehicleCompliance)

            .where(eq(vehicleCompliance.vehicleId, vehicleId));



        return {

            vehicle,

            owner,

            compliance

        };

    }



    /**
  
     * Get all vehicles for a company
  
     */

    async getCompanyVehicles(

        companyId: string,

        limit: number = 50,

        offset: number = 0,

        status?: VehicleStatus

    ) {

        let query = db

            .select()

            .from(vehicles)

            .where(eq(vehicles.companyId, companyId))

            .limit(limit)

            .offset(offset)

            .orderBy(vehicles.createdAt);



        if (status) {

            query = query.where(eq(vehicles.status, status));

        }



        return await query;

    }



    /**
  
     * Update vehicle information
  
     */

    async updateVehicle(vehicleId: string, data: UpdateVehicleData) {

        // Get current vehicle data for comparison

        const [currentVehicle] = await db

            .select()

            .from(vehicles)

            .where(eq(vehicles.id, vehicleId));



        if (!currentVehicle) {

            throw new Error('Vehicle not found');

        }



        // Update the vehicle

        const [updatedVehicle] = await db

            .update(vehicles)

            .set({

                ...data,

                updatedAt: new Date()

            })

            .where(eq(vehicles.id, vehicleId))

            .returning();



        // Emit vehicle updated event

        eventEmitter.emit(

            EventType.VEHICLE_UPDATED,

            createEventPayload({

                vehicleId,

                companyId: updatedVehicle.companyId,

                data: updatedVehicle,

                oldData: currentVehicle

            })

        );



        return updatedVehicle;

    }



    /**
  
     * Update vehicle compliance information
  
     */

    async updateVehicleCompliance(vehicleId: string, data: Partial<typeof vehicleCompliance.$inferInsert>) {

        // Get the vehicle to ensure it exists

        const [vehicle] = await db

            .select()

            .from(vehicles)

            .where(eq(vehicles.id, vehicleId));



        if (!vehicle) {

            throw new Error('Vehicle not found');

        }



        // Get current compliance data

        const [currentCompliance] = await db

            .select()

            .from(vehicleCompliance)

            .where(eq(vehicleCompliance.vehicleId, vehicleId));



        // If compliance record doesn't exist, create it

        if (!currentCompliance) {

            const [newCompliance] = await db

                .insert(vehicleCompliance)

                .values({

                    vehicleId,

                    ...data,

                })

                .returning();



            return newCompliance;

        }



        // Update existing compliance

        const [updatedCompliance] = await db

            .update(vehicleCompliance)

            .set({

                ...data,

                updatedAt: new Date()

            })

            .where(eq(vehicleCompliance.vehicleId, vehicleId))

            .returning();



        // Emit compliance updated event

        eventEmitter.emit(

            EventType.COMPLIANCE_UPDATED,

            createEventPayload({

                vehicleId,

                companyId: vehicle.companyId,

                data: updatedCompliance,

                oldData: currentCompliance

            })

        );



        return updatedCompliance;

    }



    /**
  
     * Get vehicles with expiring compliance documents
  
     */

    async getVehiclesWithExpiringCompliance(

        companyId: string,

        daysThreshold: number = 30

    ) {

        // Calculate the date threshold (today + daysThreshold)

        const today = new Date();

        const thresholdDate = new Date();

        thresholdDate.setDate(today.getDate() + daysThreshold);



        // Join vehicles and compliance tables to find vehicles with expiring documents

        const results = await db

            .select({

                vehicle: vehicles,

                compliance: vehicleCompliance

            })

            .from(vehicles)

            .where(eq(vehicles.companyId, companyId))

            .innerJoin(

                vehicleCompliance,

                eq(vehicles.id, vehicleCompliance.vehicleId)

            )

            .where(

                // Complex filter for various expiry dates

                or(

                    and(

                        not(isNull(vehicleCompliance.registrationValidUntil)),

                        lte(vehicleCompliance.registrationValidUntil, thresholdDate),

                        gt(vehicleCompliance.registrationValidUntil, today)

                    ),

                    and(

                        not(isNull(vehicleCompliance.fitnessValidUntil)),

                        lte(vehicleCompliance.fitnessValidUntil, thresholdDate),

                        gt(vehicleCompliance.fitnessValidUntil, today)

                    ),

                    and(

                        not(isNull(vehicleCompliance.insuranceValidUntil)),

                        lte(vehicleCompliance.insuranceValidUntil, thresholdDate),

                        gt(vehicleCompliance.insuranceValidUntil, today)

                    ),

                    and(

                        not(isNull(vehicleCompliance.pucValidUntil)),

                        lte(vehicleCompliance.pucValidUntil, thresholdDate),

                        gt(vehicleCompliance.pucValidUntil, today)

                    ),

                    and(

                        not(isNull(vehicleCompliance.taxValidUntil)),

                        lte(vehicleCompliance.taxValidUntil, thresholdDate),

                        gt(vehicleCompliance.taxValidUntil, today)

                    ),

                    and(

                        not(isNull(vehicleCompliance.permitValidUntil)),

                        lte(vehicleCompliance.permitValidUntil, thresholdDate),

                        gt(vehicleCompliance.permitValidUntil, today)

                    )

                )

            );



        return results;

    }

}



export const vehicleService = new VehicleService()