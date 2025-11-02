import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../utils/database.js';
import { generateToken } from '../utils/auth.js';
import googleOAuthService from '../services/googleOAuth.js';
import tokenManager from '../services/tokenManager.js';

const router = express.Router();

// Start Google OAuth flow (for signup/login)
router.get('/google/login', async (req, res) => {
  try {
    const state = googleOAuthService.generateStateToken(null, 'login');
    const authUrl = googleOAuthService.generateAuthUrl(state);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Google login initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate Google login' });
  }
});

// Start Google OAuth flow (for connecting account)
router.get('/google/connect', authenticate, async (req, res) => {
  try {
    const state = googleOAuthService.generateStateToken(req.user.id, 'connect');
    const authUrl = googleOAuthService.generateAuthUrl(state, req.user.email);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Google connect initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate Google connection' });
  }
});

// OAuth callback handler
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/error?error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/error?error=missing_parameters`);
    }
    
    const stateData = googleOAuthService.parseStateToken(state);
    const { userId, action } = stateData;
    
    const tokens = await googleOAuthService.exchangeCodeForTokens(code);
    const userInfo = await googleOAuthService.getUserInfo(tokens.accessToken);
    
    if (action === 'login') {
      let user = await query(
        'SELECT * FROM users WHERE google_id = $1',
        [userInfo.googleId]
      );
      
      if (user.rows.length === 0) {
        user = await query(
          'SELECT * FROM users WHERE email = $1',
          [userInfo.email]
        );
        
        if (user.rows.length > 0) {
          await query(
            'UPDATE users SET google_id = $1, profile_picture = $2 WHERE id = $3',
            [userInfo.googleId, userInfo.picture, user.rows[0].id]
          );
        } else {
          const newUser = await query(
            `INSERT INTO users (email, password_hash, full_name, google_id, profile_picture, email_verified)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userInfo.email, '', userInfo.name, userInfo.googleId, userInfo.picture, userInfo.emailVerified]
          );
          user = newUser;
          
          await query(
            `INSERT INTO usage_tracking (user_id, date) 
             VALUES ($1, CURRENT_DATE) 
             ON CONFLICT (user_id, date) DO NOTHING`,
            [newUser.rows[0].id]
          );
        }
      }
      
      const currentUser = user.rows[0];
      await tokenManager.storeTokens(currentUser.id, tokens);
      
      await query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [currentUser.id]
      );
      
      const jwtToken = generateToken(currentUser);
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/success?token=${jwtToken}`);
    } else if (action === 'connect') {
      if (!userId) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/error?error=invalid_state`);
      }
      
      const existingGoogleUser = await query(
        'SELECT id FROM users WHERE google_id = $1 AND id != $2',
        [userInfo.googleId, userId]
      );
      
      if (existingGoogleUser.rows.length > 0) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=google_account_already_linked`);
      }
      
      await query(
        'UPDATE users SET google_id = $1, profile_picture = $2 WHERE id = $3',
        [userInfo.googleId, userInfo.picture, userId]
      );
      
      await tokenManager.storeTokens(userId, tokens);
      
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?success=google_connected`);
    }
    
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/error?error=invalid_action`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/google/error?error=callback_failed`);
  }
});

// Check Google connection status
router.get('/google/status', authenticate, async (req, res) => {
  try {
    const user = await query(
      'SELECT google_id, profile_picture FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const isConnected = !!user.rows[0].google_id;
    const tokenInfo = isConnected ? await tokenManager.getTokenInfo(req.user.id) : null;
    
    res.json({
      isConnected,
      googleId: user.rows[0].google_id,
      profilePicture: user.rows[0].profile_picture,
      tokenInfo,
    });
  } catch (error) {
    console.error('Google status check error:', error);
    res.status(500).json({ error: 'Failed to check Google connection status' });
  }
});

// Disconnect Google account
router.post('/google/disconnect', authenticate, async (req, res) => {
  try {
    await tokenManager.deleteTokens(req.user.id);
    
    await query(
      'UPDATE users SET google_id = NULL WHERE id = $1',
      [req.user.id]
    );
    
    res.json({ message: 'Google account disconnected successfully' });
  } catch (error) {
    console.error('Google disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
});

export default router;
