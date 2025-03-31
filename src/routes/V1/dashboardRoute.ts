// src/routes/dashboardRoutes.ts
import express from 'express';
import {
    getChallanAnalytics,
    getComplianceAnalytics,
    getDashboardMetrics
} from '../../controllers/dashboardController';
import { protect } from '../../middlewares/authMiddleware';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.get('/metrics', getDashboardMetrics);
router.get('/challan-analytics', getChallanAnalytics);
router.get('/compliance-analytics', getComplianceAnalytics);

export default router;