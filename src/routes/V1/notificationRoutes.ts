// src/routes/notificationRoutes.ts
import express from 'express';
import {
    getNotificationSettings,
    getUserNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    updateNotificationSettings
} from '../../controllers/notificationController';
import { protect } from '../../middlewares/authMiddleware';
import validateRequest from '../../middlewares/validate';
import { updateNotificationSettingsSchema } from '../../validators/notificationValidator';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.get('/', getUserNotifications);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);

router.route('/settings')
    .get(getNotificationSettings)
    .put(validateRequest(updateNotificationSettingsSchema), updateNotificationSettings);

export default router;