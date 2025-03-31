// src/routes/subscriptionRoutes.ts
import express from 'express';
import {
    createPaymentOrder,
    getCurrentSubscription,
    getSubscriptionHistory,
    getSubscriptionPlans,
    handlePaymentFailure,
    verifyPayment
} from '../controllers/subscriptionController';
import { protect } from '../middlewares/auth';
import validateRequest from '../middlewares/validateRequest';
import {
    createOrderSchema,
    paymentFailureSchema,
    verifyPaymentSchema
} from '../validators/subscriptionValidator';

const router = express.Router();

// Public routes
router.get('/plans', getSubscriptionPlans);

// Protected routes
router.use(protect);
router.get('/current', getCurrentSubscription);
router.get('/history', getSubscriptionHistory);
router.post('/create-order', validateRequest(createOrderSchema), createPaymentOrder);
router.post('/verify-payment', validateRequest(verifyPaymentSchema), verifyPayment);
router.post('/payment-failed', validateRequest(paymentFailureSchema), handlePaymentFailure);

export default router;
