import express from 'express';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Sign up
router.post('/signup', validate(schemas.register), async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      logger.warn('Registration attempted with existing email', { email });
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name, role, created_at`,
      [email, passwordHash, fullName]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken(user);

    // Initialize usage tracking for today
    await query(
      `INSERT INTO usage_tracking (user_id, date) 
       VALUES ($1, CURRENT_DATE) 
       ON CONFLICT (user_id, date) DO NOTHING`,
      [user.id]
    );

    logger.info('New user registered', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    logger.error('Signup failed', { error: error.message });
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn('Login attempt with non-existent email', { email });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      logger.warn('Login attempt on inactive account', { email, userId: user.id });
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      logger.warn('Login attempt with invalid password', { email });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Update last login
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Initialize usage tracking for today
    await query(
      `INSERT INTO usage_tracking (user_id, date) 
       VALUES ($1, CURRENT_DATE) 
       ON CONFLICT (user_id, date) DO NOTHING`,
      [user.id]
    );

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, role, created_at, last_login_at, 
              settings, preferences 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get today's usage
    const usage = await query(
      `SELECT messages_sent, voice_minutes_used, tokens_consumed, files_uploaded
       FROM usage_tracking 
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );

    const user = result.rows[0];
    const todayUsage = usage.rows[0] || {
      messages_sent: 0,
      voice_minutes_used: 0,
      tokens_consumed: 0,
      files_uploaded: 0,
    };

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        settings: user.settings,
        preferences: user.preferences,
      },
      usage: todayUsage,
      limits: {
        messagesPerDay: parseInt(process.env.RATE_LIMIT_MESSAGES) || 100,
        voiceMinutesPerDay: parseInt(process.env.RATE_LIMIT_VOICE_MINUTES) || 30,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user settings
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { settings, preferences } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (settings) {
      updates.push(`settings = $${paramCount++}`);
      values.push(JSON.stringify(settings));
    }

    if (preferences) {
      updates.push(`preferences = $${paramCount++}`);
      values.push(JSON.stringify(preferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(req.user.id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Logout (client-side only, but we can track it)
router.post('/logout', authenticate, async (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // But we can log it for analytics
  res.json({ message: 'Logged out successfully' });
});

export default router;
