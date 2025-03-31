import cron from 'node-cron';

const { logger } = require('../config/logger');

import { complianceChecker } from './complianceChecker';

import { challanChecker } from './challanChecker';

import { eventEmitter } from '../events/eventEmitter';

import { EventType, createEventPayload } from '../events/eventTypes';

import { db } from '../config/db';

import { companySubscriptions, subscriptionPlans } from '../models';

import { and, eq, gte } from 'drizzle-orm';

import { SubscriptionStatus } from '../models/types/enums';

// Store for active jobs

const schedulers: { [key: string]: cron.ScheduledTask } = {};

// Default schedules based on plan tiers

const SCHEDULE_CONFIG = {

    FREE: {

        complianceCheck: '0 1 * * *',     // Once daily at 1 AM

        challanCheck: '0 */12 * * *'      // Every 12 hours

    },

    BASIC: {

        complianceCheck: '0 1 * * *',     // Once daily at 1 AM

        challanCheck: '0 */6 * * *'       // Every 6 hours

    },

    PREMIUM: {

        complianceCheck: '0 1 * * *',     // Once daily at 1 AM

        challanCheck: '0 */4 * * *'       // Every 4 hours

    },

    ENTERPRISE: {

        complianceCheck: '0 1 * * *',     // Once daily at 1 AM

        challanCheck: '0 */2 * * *'       // Every 2 hours

    }

};

/**

 * Initialize all scheduled tasks

 */

export async function initSchedulers() {

    logger.info('Initializing scheduler jobs');



    // Start global schedulers that run for all companies

    scheduleGlobalJobs();



    // Schedule plan-specific jobs

    await schedulePlanBasedJobs();



    logger.info('All scheduler jobs initialized');

}

/**

 * Schedule global jobs that run for the entire system

 */

function scheduleGlobalJobs() {

    // Schedule the jobs that run for all companies

    // For example, database maintenance, log cleanup, etc.



    // Example: Schedule a job to clean up old logs every day at midnight

    scheduleJob('log-cleanup', '0 0 * * *', async () => {

        // This would be implemented with actual cleanup logic

        logger.info('Running log cleanup job');

        return { message: 'Logs cleaned up successfully' };

    });

}

/**

 * Schedule jobs based on company subscription plans

 */

async function schedulePlanBasedJobs() {

    try {

        // Get all active subscription plans

        const plans = await db.select().from(subscriptionPlans)

            .where(eq(subscriptionPlans.isActive, true));



        // Schedule jobs for each plan tier

        for (const plan of plans) {

            // Get plan configuration based on plan name

            // Default to FREE if no matching plan is found

            const planTier = plan.name.toUpperCase() as keyof typeof SCHEDULE_CONFIG;

            const scheduleConfig = SCHEDULE_CONFIG[planTier] || SCHEDULE_CONFIG.FREE;



            // Schedule compliance check for this plan tier

            scheduleJob(

                `compliance-check-${plan.id}`,

                scheduleConfig.complianceCheck,

                async () => {

                    logger.info(`Running compliance check for plan tier: ${plan.name}`);



                    // Get all active companies on this plan

                    const activeSubscriptions = await getActiveCompaniesForPlan(plan.id);



                    // Run compliance check for each company

                    const results = {

                        planId: plan.id,

                        planName: plan.name,

                        companiesChecked: 0,

                        notificationsCreated: 0,

                        errors: 0

                    };



                    for (const subscription of activeSubscriptions) {

                        try {

                            const notifications = await complianceChecker.checkCompanyVehicles(subscription.companyId);

                            results.companiesChecked++;

                            results.notificationsCreated += notifications;

                        } catch (error) {

                            logger.error(`Error checking compliance for company ${subscription.companyId} on plan ${plan.name}`, error);

                            results.errors++;

                        }

                    }



                    logger.info(`Completed compliance check for plan tier: ${plan.name}`, results);

                    return results;

                }

            );



            // Schedule challan check for this plan tier

            scheduleJob(

                `challan-check-${plan.id}`,

                scheduleConfig.challanCheck,

                async () => {

                    logger.info(`Running challan check for plan tier: ${plan.name}`);



                    // Get all active companies on this plan

                    const activeSubscriptions = await getActiveCompaniesForPlan(plan.id);



                    // Run challan check for each company

                    const results = {

                        planId: plan.id,

                        planName: plan.name,

                        companiesChecked: 0,

                        newChallansFound: 0,

                        errors: 0

                    };



                    for (const subscription of activeSubscriptions) {

                        try {

                            const newChallans = await challanChecker.syncCompanyVehicleChallans(subscription.companyId);

                            results.companiesChecked++;

                            results.newChallansFound += newChallans;

                        } catch (error) {

                            logger.error(`Error checking challans for company ${subscription.companyId} on plan ${plan.name}`, error);

                            results.errors++;

                        }

                    }



                    logger.info(`Completed challan check for plan tier: ${plan.name}`, results);

                    return results;

                }

            );

        }

    } catch (error) {

        logger.error('Failed to schedule plan-based jobs', error);

        throw error;

    }

}

/**

 * Get active companies for a specific subscription plan

 */

async function getActiveCompaniesForPlan(planId: string) {

    // Get current date for comparison

    const today = new Date();



    // Query for active subscriptions

    const activeSubscriptions = await db

        .select()

        .from(companySubscriptions)

        .where(

            and(

                eq(companySubscriptions.planId, planId),

                eq(companySubscriptions.status, SubscriptionStatus.ACTIVE),

                gte(companySubscriptions.endDate, today)

            )

        );



    return activeSubscriptions;

}

/**

 * Schedule a cron job

 * @param name Unique job name

 * @param cronExpression Cron expression (e.g., '* * * * *')

 * @param callback Function to execute

 */

function scheduleJob(name: string, cronExpression: string, callback: () => Promise<any>) {

    logger.info(`Scheduling job: ${name} with schedule: ${cronExpression}`);



    // Validate cron expression

    if (!cron.validate(cronExpression)) {

        logger.error(`Invalid cron expression: ${cronExpression} for job: ${name}`);

        return;

    }



    // Schedule the job

    const task = cron.schedule(cronExpression, async () => {

        logger.info(`Running scheduled job: ${name}`);



        try {

            const result = await callback();



            // Emit completion event

            eventEmitter.emit(

                EventType.SCHEDULER_COMPLETED,

                createEventPayload({

                    component: name,

                    data: { result }

                })

            );



            logger.info(`Scheduled job completed: ${name}`);

        } catch (error) {

            logger.error(`Scheduled job failed: ${name}`, error);



            // Emit failure event

            eventEmitter.emit(

                EventType.SCHEDULER_FAILED,

                createEventPayload({

                    component: name,

                    error,

                    data: { schedule: cronExpression }

                })

            );

        }

    }, {

        scheduled: true,

        timezone: process.env.TIMEZONE || 'Asia/Kolkata' // Default to Indian timezone

    });



    // Store the task

    schedulers[name] = task;



    // Start the task

    task.start();

}

/**

 * Stop all scheduled jobs

 */

export function stopAllSchedulers() {

    logger.info('Stopping all scheduled jobs');



    Object.keys(schedulers).forEach(name => {

        schedulers[name].stop();

        logger.info(`Stopped scheduled job: ${name}`);

    });

}

/**

 * Stop a specific scheduled job

 */

export function stopScheduler(name: string) {

    if (schedulers[name]) {

        schedulers[name].stop();

        delete schedulers[name];

        logger.info(`Stopped scheduled job: ${name}`);

    }

}

/**

 * Refresh plan-based schedulers - call this after subscription changes

 */

export async function refreshPlanSchedulers() {

    logger.info('Refreshing plan-based schedulers');



    // Stop existing plan-based schedulers

    Object.keys(schedulers).forEach(name => {

        if (name.startsWith('compliance-check-') || name.startsWith('challan-check-')) {

            schedulers[name].stop();

            delete schedulers[name];

            logger.info(`Stopped scheduled job: ${name}`);

        }

    });



    // Reschedule plan-based jobs

    await schedulePlanBasedJobs();



    logger.info('Plan-based schedulers refreshed');

}