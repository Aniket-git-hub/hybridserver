
// src/routes/companyRoutes.ts
import express from 'express';
import {
    getCompanyDetails,
    updateCompanyDetails
} from '../../controllers/companyController';
import { authorize, protect } from '../../middlewares/authMiddleware';
import validateRequest from '../../middlewares/validate';
import { updateCompanySchema } from '../../validators/companyValidator';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
    .get(getCompanyDetails)
    .put(authorize('ADMIN'), validateRequest(updateCompanySchema), updateCompanyDetails);

export default router;