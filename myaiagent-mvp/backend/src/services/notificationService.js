import { query } from '../utils/database.js';

/**
 * proper notification service
 */
class NotificationService {
    /**
     * Create a new notification for a user
     * @param {number} userId - The recipient user ID
     * @param {string} type - Notification type (reminder, new_match, etc.)
     * @param {string} title - Short title
     * @param {string} message - Detailed message (optional)
     * @param {Object} data - Metadata for handling clicks (e.g., { opportunityId: 123 })
     */
    async createNotification(userId, type, title, message = '', data = {}) {
        try {
            const result = await query(
                `INSERT INTO notifications (user_id, type, title, message, data, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
                [userId, type, title, message, data]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Failed to create notification:', error);
            throw error;
        }
    }

    /**
     * Get unread notifications for a user
     */
    async getUnread(userId, limit = 20) {
        try {
            const result = await query(
                `SELECT * FROM notifications 
         WHERE user_id = $1 AND is_read = FALSE
         ORDER BY created_at DESC
         LIMIT $2`,
                [userId, limit]
            );
            return result.rows;
        } catch (error) {
            console.error('Failed to get unread notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(id, userId) {
        try {
            await query(
                `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );
            return true;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            throw error;
        }
    }

    /**
   * Mark ALL notifications as read for a user
   */
    async markAllAsRead(userId) {
        try {
            await query(
                `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
                [userId]
            );
            return true;
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Delete old read notifications (cleanup)
     * Keeps last 100 or 30 days, currently simple implementation
     */
    async cleanupOldNotifications() {
        // Implementation for background cleanup job
        try {
            await query(
                `DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'`
            );
        } catch (error) {
            console.error('Failed to cleanup old notifications', error);
        }
    }
}

export default new NotificationService();
