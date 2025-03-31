// src/validators/vehicleValidator.ts
import Joi from 'joi';

export const createVehicleSchema = Joi.object({
    registrationNumber: Joi.string().required().trim(),
    chassisNumber: Joi.string().allow('', null),
    engineNumber: Joi.string().allow('', null),
    vehicleClass: Joi.string().allow('', null),
    vehicleCategory: Joi.string().allow('', null),
    maker: Joi.string().allow('', null),
    model: Joi.string().allow('', null),
    manufacturedDate: Joi.date().allow(null),
    fuelType: Joi.string().allow('', null),
    ownerName: Joi.string().allow('', null),
    ownerFatherName: Joi.string().allow('', null),
    permanentAddress: Joi.string().allow('', null),
    mobileNumber: Joi.string().allow('', null)
});

export const updateVehicleSchema = Joi.object({
    chassisNumber: Joi.string().allow('', null),
    engineNumber: Joi.string().allow('', null),
    vehicleClass: Joi.string().allow('', null),
    vehicleCategory: Joi.string().allow('', null),
    maker: Joi.string().allow('', null),
    model: Joi.string().allow('', null),
    manufacturedDate: Joi.date().allow(null),
    fuelType: Joi.string().allow('', null),
    fuelNorms: Joi.string().allow('', null),
    vehicleColor: Joi.string().allow('', null),
    bodyType: Joi.string().allow('', null),
    unladenWeight: Joi.number().allow(null),
    grossWeight: Joi.number().allow(null),
    numberOfCylinders: Joi.number().allow(null),
    cubicCapacity: Joi.number().allow(null),
    seatingCapacity: Joi.number().allow(null),
    standingCapacity: Joi.number().allow(null),
    sleeperCapacity: Joi.number().allow(null),
    wheelBase: Joi.number().allow(null)
});
