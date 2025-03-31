// src/validators/companyValidator.ts
import Joi from 'joi';

export const updateCompanySchema = Joi.object({
    name: Joi.string().trim(),
    address: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    state: Joi.string().allow('', null),
    pincode: Joi.string().allow('', null),
    gstNumber: Joi.string().allow('', null),
    contactEmail: Joi.string().email(),
    contactPhone: Joi.string(),
    logoUrl: Joi.string().allow('', null),
    website: Joi.string().allow('', null),
    businessType: Joi.string().allow('', null)
});