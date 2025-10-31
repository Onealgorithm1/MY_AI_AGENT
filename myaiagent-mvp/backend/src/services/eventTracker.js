import pool from '../utils/database.js';

export class EventTracker {
  static async logUserAction(userId, eventType, eventData = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO user_events (user_id, event_type, event_data, created_at) 
         VALUES ($1, $2, $3::jsonb, NOW()) 
         RETURNING id, event_type, created_at`,
        [userId, eventType, JSON.stringify(eventData)]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Event logging error:', error);
      throw error;
    }
  }
  
  static async getRecentEvents(userId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT id, event_type, event_data, created_at 
         FROM user_events 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Get recent events error:', error);
      throw error;
    }
  }
  
  static async getEventsSince(userId, sinceDate) {
    try {
      const result = await pool.query(
        `SELECT id, event_type, event_data, created_at 
         FROM user_events 
         WHERE user_id = $1 AND created_at > $2 
         ORDER BY created_at ASC`,
        [userId, sinceDate]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Get events since error:', error);
      throw error;
    }
  }
}
