import { NextFunction, Request, Response } from 'express';

import { UserRole } from '../models/types/enums';

// Middleware to restrict access based on user role

export const restrictTo = (...roles: (keyof typeof UserRole)[]) => {

    return (req: Request, res: Response, next: NextFunction) => {

        // Check if user exists (should be attached by protect middleware)

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message: 'Please log in to access this resource'

            });

        }

        // Check if user role is included in allowed roles

        if (!roles.includes(req.user.role as keyof typeof UserRole)) {

            return res.status(403).json({

                success: false,

                message: 'You do not have permission to perform this action'

            });

        }

        next();

    };

};

// Middleware to ensure user belongs to the company they're accessing

export const ensureCompanyAccess = (req: Request, res: Response, next: NextFunction) => {

    const { companyId } = req.params;



    // If no companyId in params, skip this check

    if (!companyId) {

        return next();

    }



    // Check if user exists

    if (!req.user) {

        return res.status(401).json({

            success: false,

            message: 'Please log in to access this resource'

        });

    }



    // Check if user belongs to the requested company

    if (req.user.companyId !== companyId) {

        return res.status(403).json({

            success: false,

            message: 'You do not have permission to access this company data'

        });

    }



    next();

};