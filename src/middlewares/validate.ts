// src/middlewares/validate.ts
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import ErrorResponse from '../utils/errorResponse';

const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return next(new ErrorResponse(errorMessage, 400));
        }

        next();
    };
};

export default validate;