// src/routes/vehicleRoutes.ts
import express from 'express';
import {
    checkVehicleChallanStatus,
    createVehicle,
    deleteVehicle,
    fetchVehicleRcDetails,
    getVehicle,
    getVehicles,
    updateVehicle
} from '../../controllers/vehicleController';
import { authorize, protect } from '../../middlewares/authMiddleware';
import validateRequest from '../../middlewares/validate';
import { createVehicleSchema, updateVehicleSchema } from '../../validators/vehicleValidator';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
    .get(getVehicles)
    .post(validateRequest(createVehicleSchema), createVehicle);

router.route('/:id')
    .get(getVehicle)
    .put(validateRequest(updateVehicleSchema), updateVehicle)
    .delete(authorize('ADMIN', 'MANAGER'), deleteVehicle);

router.post('/:id/check-challans', checkVehicleChallanStatus);
router.post('/:id/fetch-rc-details', fetchVehicleRcDetails);

export default router;
