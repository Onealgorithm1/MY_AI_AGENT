import { query } from '../utils/database.js';

const MESSAGES_LIMIT = parseInt(process.env.RATE_LIMIT_MESSAGES) || 100;
const VOICE_MINUTES_LIMIT = parseInt(process.env.RATE_LIMIT_VOICE_MINUTES) || 30;

// Check if user has exceeded daily message limit
export async function checkRateLimit(req, res, next) {
  try {
    const userId = req.user.id;

    // Get today's usage
    const result = await query(
      `SELECT messages_sent, voice_minutes_used 
       FROM usage_tracking 
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize tracking for today
      await query(
        `INSERT INTO usage_tracking (user_id, date) 
         VALUES ($1, CURRENT_DATE)`,
        [userId]
      );
      return next();
    }

    const usage = result.rows[0];

    // Check message limit
    if (usage.messages_sent >= MESSAGES_LIMIT) {
      return res.status(429).json({
        error: 'Daily message limit reached',
        limit: MESSAGES_LIMIT,
        used: usage.messages_sent,
        resetsAt: 'midnight UTC',
      });
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next(); // Allow request on error
  }
}

// Check voice minutes limit
export async function checkVoiceLimit(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT voice_minutes_used 
       FROM usage_tracking 
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );

    if (result.rows.length === 0) {
      await query(
        `INSERT INTO usage_tracking (user_id, date) 
         VALUES ($1, CURRENT_DATE)`,
        [userId]
      );
      return next();
    }

    const usage = result.rows[0];

    if (usage.voice_minutes_used >= VOICE_MINUTES_LIMIT) {
      return res.status(429).json({
        error: 'Daily voice limit reached',
        limit: VOICE_MINUTES_LIMIT,
        used: usage.voice_minutes_used,
        resetsAt: 'midnight UTC',
      });
    }

    next();
  } catch (error) {
    console.error('Voice limit check error:', error);
    next();
  }
}

// Increment usage counters
export async function incrementMessageCount(userId) {
  await query(
    `INSERT INTO usage_tracking (user_id, date, messages_sent)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date) 
     DO UPDATE SET messages_sent = usage_tracking.messages_sent + 1`,
    [userId]
  );
}

export async function incrementVoiceMinutes(userId, minutes) {
  await query(
    `INSERT INTO usage_tracking (user_id, date, voice_minutes_used)
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (user_id, date) 
     DO UPDATE SET voice_minutes_used = usage_tracking.voice_minutes_used + $2`,
    [userId, minutes]
  );
}

export async function incrementFileCount(userId) {
  await query(
    `INSERT INTO usage_tracking (user_id, date, files_uploaded)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date) 
     DO UPDATE SET files_uploaded = usage_tracking.files_uploaded + 1`,
    [userId]
  );
}
