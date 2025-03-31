import { Request, Response } from 'express';

const logger = require('../config/logger');

import { complianceChecker } from '../schedulers/complianceChecker';

import { challanChecker } from '../schedulers/challanChecker';

import { refreshPlanSchedulers } from '../schedulers';

import { UserRole } from '../models/types/enums';

/**

 * Force a compliance check for the user's company

 * Available to admin/manager users

 */

export const forceComplianceCheck = async (req: Request, res: Response) => {

    try {

        const companyId = (req as any).user.companyId;



        // Check if user has appropriate role

        if (![(req as any).user.role].includes(UserRole.ADMIN, UserRole.MANAGER)) {

            return res.status(403).json({

                success: false,

                message: 'You do not have permission to perform this action'

            });

        }



        logger.info(`Force compliance check requested for company ${companyId}`);



        // Run the check

        const notifications = await complianceChecker.checkCompanyVehicles(companyId);



        res.status(200).json({

            success: true,

            data: {

                notificationsCreated: notifications,

                message: 'Compliance check completed successfully'

            }

        });

    } catch (error: any) {

        logger.error('Force compliance check error:', error);

        res.status(500).json({

            success: false,

            message: error.message || 'Failed to run compliance check'

        });

    }

};

/**

 * Force a challan sync for the user's company

 * Available to admin/manager users

 */

export const forceChallanSync = async (req: Request, res: Response) => {

    try {

        const companyId = (req as any).user.companyId;



        // Check if user has appropriate role

        if (![(req as any).user.role].includes(UserRole.ADMIN, UserRole.MANAGER)) {

            return res.status(403).json({

                success: false,

                message: 'You do not have permission to perform this action'

            });

        }



        logger.info(`Force challan sync requested for company ${companyId}`);



        // Run the sync

        const newChallans = await challanChecker.forceSyncCompany(companyId);



        res.status(200).json({

            success: true,

            data: {

                newChallansFound: newChallans,

                message: 'Challan sync completed successfully'

            }

        });

    } catch (error: any) {

        logger.error('Force challan sync error:', error);

        res.status(500).json({

            success: false,

            message: error.message || 'Failed to run challan sync'

        });

    }

};

/**

 * Refresh all plan-based schedulers

 * Admin only endpoint - meant for system administrators

 */

export const refreshSchedulers = async (req: Request, res: Response) => {

    try {

        // Check if user is system admin

        if ((req as any).user.role !== UserRole.ADMIN) {

            return res.status(403).json({

                success: false,

                message: 'You do not have permission to perform this action'

            });

        }



        logger.info('Scheduler refresh requested');



        // Refresh schedulers

        await refreshPlanSchedulers();



        res.status(200).json({

            success: true,

            message: 'Schedulers refreshed successfully'

        });

    } catch (error: any) {

        logger.error('Scheduler refresh error:', error);

        res.status(500).json({

            success: false,

            message: error.message || 'Failed to refresh schedulers'

        });

    }

};