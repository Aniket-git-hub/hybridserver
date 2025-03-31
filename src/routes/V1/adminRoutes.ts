// src/routes/adminRoutes.ts
import express from 'express';
import {
    createManualSubscription,
    createSubscriptionPlan,
    getAllCompanies,
    getCompanyDetails,
    updateCompanyStatus,
    updatePlanStatus,
    updateSubscriptionPlan
} from '../controllers/adminController';
import { authorize, protect } from '../middlewares/auth';
import validateRequest from '../middlewares/validateRequest';
import {
    createManualSubscriptionSchema,
    createPlanSchema,
    planStatusSchema,
    updateCompanyStatusSchema,
    updatePlanSchema
} from '../validators/adminValidator';

const router = express.Router();

// All routes require authentication and super admin role
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// Company routes
router.get('/companies', getAllCompanies);
router.get('/companies/:id', getCompanyDetails);
router.put('/companies/:id/status', validateRequest(updateCompanyStatusSchema), updateCompanyStatus);

// Subscription plan routes
router.post('/subscription-plans', validateRequest(createPlanSchema), createSubscriptionPlan);
router.put('/subscription-plans/:id', validateRequest(updatePlanSchema), updateSubscriptionPlan);
router.put('/subscription-plans/:id/status', validateRequest(planStatusSchema), updatePlanStatus);

// Manual subscription creation
router.post('/companies/:id/subscriptions', validateRequest(createManualSubscriptionSchema), createManualSubscription);

export default router;