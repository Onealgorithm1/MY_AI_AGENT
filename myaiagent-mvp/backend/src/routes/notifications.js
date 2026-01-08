import express from 'express';
import { authenticate } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

router.use(authenticate);

// GET /api/notifications - List unread notifications
router.get('/', async (req, res) => {
    try {
        // Optional query param ?all=true to get read ones too? For now just unread or simple list
        const notifications = await notificationService.getUnread(req.user.id);
        res.json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await notificationService.markAsRead(id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', async (req, res) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notification as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;
