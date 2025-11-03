import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for profile picture uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const profilePicsDir = path.join(uploadDir, 'profile-pictures');

// Ensure directories exist
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `user-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile pictures
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  },
});

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
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

    // Set JWT as HTTP-only cookie (SECURITY: XSS protection)
    const cookieOptions = {
      httpOnly: true, // Prevents client-side JavaScript access (XSS defense)
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict', // CSRF defense
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
    res.cookie('jwt', token, cookieOptions);

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

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

    // Set JWT as HTTP-only cookie (SECURITY: XSS protection)
    const cookieOptions = {
      httpOnly: true, // Prevents client-side JavaScript access (XSS defense)
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict', // CSRF defense
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };
    res.cookie('jwt', token, cookieOptions);

    res.json({
      status: 'success',
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
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

// Logout - Clear HTTP-only cookie
router.post('/logout', authenticate, async (req, res) => {
  // Clear the JWT cookie
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  res.json({ 
    status: 'success',
    message: 'Logged out successfully' 
  });
});

// Get full user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, phone, profile_image, role, created_at, last_login_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      profileImage: user.profile_image,
      role: user.role,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;

    // Validate input
    if (!fullName || fullName.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!email || email.trim().length === 0) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    if (email !== req.user.email) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Phone validation (optional field)
    if (phone && phone.length > 50) {
      return res.status(400).json({ error: 'Phone number too long' });
    }

    // Update user
    const result = await query(
      `UPDATE users 
       SET full_name = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING id, email, full_name, phone, profile_image, role, created_at, last_login_at, settings, preferences`,
      [fullName.trim(), email.trim(), phone?.trim() || null, req.user.id]
    );

    const user = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        profileImage: user.profile_image,
        role: user.role,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        settings: user.settings,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update profile image
router.put('/profile/image', authenticate, async (req, res) => {
  try {
    const { profileImage } = req.body;

    if (!profileImage || profileImage.trim().length === 0) {
      return res.status(400).json({ error: 'Profile image URL is required' });
    }

    // URL validation
    try {
      new URL(profileImage);
    } catch {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    await query(
      'UPDATE users SET profile_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [profileImage.trim(), req.user.id]
    );

    res.json({
      message: 'Profile image updated successfully',
      profileImage: profileImage.trim(),
    });
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

// Change password
router.put('/profile/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload profile picture (file upload)
router.post('/profile/upload-picture', authenticate, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Delete old profile picture if it exists and is a local file
    if (req.user.profile_image) {
      const oldImagePath = req.user.profile_image;
      // Only delete if it's a local file (starts with /uploads/)
      if (oldImagePath.startsWith('/uploads/')) {
        const fullPath = path.join(__dirname, '../../', oldImagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    // Generate public URL for the uploaded file
    const profileImageUrl = `/uploads/profile-pictures/${req.file.filename}`;

    // Update user's profile image in database
    const result = await query(
      `UPDATE users 
       SET profile_image = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, full_name, phone, profile_image, role, created_at, last_login_at, settings, preferences`,
      [profileImageUrl, req.user.id]
    );

    const user = result.rows[0];

    res.json({
      message: 'Profile picture uploaded successfully',
      profileImage: profileImageUrl,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        profileImage: user.profile_image,
        role: user.role,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        settings: user.settings,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    
    // Delete uploaded file if database update fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.message && error.message.includes('Only image files')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// ============================================
// User Preferences Management
// ============================================

// Get user preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT preferences FROM users WHERE id = $1',
      [req.user.id]
    );

    const preferences = result.rows[0]?.preferences || {};

    res.json({ 
      preferences,
      tts_enabled: preferences.tts_enabled || false,
      tts_voice_id: preferences.tts_voice_id || 'EXAVITQu4vr4xnSDxMaL'
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { preferences, tts_enabled, tts_voice_id } = req.body;

    // Get current preferences
    const currentResult = await query(
      'SELECT preferences FROM users WHERE id = $1',
      [req.user.id]
    );

    const currentPreferences = currentResult.rows[0]?.preferences || {};
    
    // Merge preferences (handle both full preferences object and individual TTS settings)
    let mergedPreferences = { ...currentPreferences };
    
    if (preferences && typeof preferences === 'object') {
      mergedPreferences = { ...mergedPreferences, ...preferences };
    }
    
    // Handle TTS settings separately to allow granular updates
    if (tts_enabled !== undefined) {
      mergedPreferences.tts_enabled = tts_enabled;
    }
    
    if (tts_voice_id !== undefined) {
      mergedPreferences.tts_voice_id = tts_voice_id;
    }

    // Update preferences
    const result = await query(
      `UPDATE users 
       SET preferences = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, full_name, phone, profile_image, role, created_at, last_login_at, settings, preferences`,
      [JSON.stringify(mergedPreferences), req.user.id]
    );

    const user = result.rows[0];

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
      tts_enabled: user.preferences.tts_enabled || false,
      tts_voice_id: user.preferences.tts_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        profileImage: user.profile_image,
        role: user.role,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        settings: user.settings,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Reset preferences to defaults
router.delete('/preferences', authenticate, async (req, res) => {
  try {
    const result = await query(
      `UPDATE users 
       SET preferences = '{}', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING preferences`,
      [req.user.id]
    );

    res.json({
      message: 'Preferences reset successfully',
      preferences: result.rows[0].preferences,
    });
  } catch (error) {
    console.error('Reset preferences error:', error);
    res.status(500).json({ error: 'Failed to reset preferences' });
  }
});

export default router;
