import express from 'express';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Auto-login to Planka - creates user and generates token
router.get('/auto-login', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userName = req.user.full_name || userEmail.split('@')[0];
    
    // Check if Planka user exists
    let plankaUser = await query(
      'SELECT id FROM user_account WHERE email = $1',
      [userEmail]
    );

    // Create Planka user if doesn't exist
    if (plankaUser.rows.length === 0) {
      // Create with a random password (won't be used - auto-login only)
      const randomPassword = '$2b$10$' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const result = await query(
        `INSERT INTO user_account (
          email, password, role, name, username,
          subscribe_to_own_cards, subscribe_to_card_when_commenting,
          turn_off_recent_card_highlighting, enable_favorites_by_default,
          default_editor_mode, default_home_view, default_projects_order,
          is_sso_user, is_deactivated
        ) VALUES ($1, $2, 'user', $3, $4, false, false, false, false, 'viewer', 'projects', 'nameAsc', true, false)
        RETURNING id`,
        [userEmail, randomPassword, userName, userEmail.split('@')[0]]
      );
      
      plankaUser = await query(
        'SELECT id FROM user_account WHERE id = $1',
        [result.rows[0].id]
      );
    }

    // Generate Planka access token
    const tokenResult = await query(
      `INSERT INTO access_token (user_id, created_at)
       VALUES ($1, NOW())
       RETURNING id`,
      [plankaUser.rows[0].id]
    );

    const accessToken = tokenResult.rows[0].id;

    // Redirect to Planka with auto-login token
    const plankaUrl = `https://81bfa9ca-3a81-445f-967b-74ff4308a2a2-00-319gs23zyrbd7.riker.replit.dev:3002?accessToken=${accessToken}`;
    res.redirect(plankaUrl);
  } catch (error) {
    console.error('Planka auto-login error:', error);
    res.status(500).json({ error: 'Failed to access Planka' });
  }
});

export default router;
