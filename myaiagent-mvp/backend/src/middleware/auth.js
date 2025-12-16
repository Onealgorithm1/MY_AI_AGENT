import { verifyToken, extractToken } from '../utils/auth.js';
import { query } from '../utils/database.js';

// Authenticate user from JWT token
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);

    // Validate user ID is an integer (not UUID)
    const userId = parseInt(decoded.id, 10);
    if (!Number.isInteger(userId)) {
      console.error('Invalid user ID format in token:', decoded.id);
      res.clearCookie('jwt');
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Get user from database with complete profile information
    const result = await query(
      `SELECT id, email, full_name, role, is_active, phone, profile_image,
              created_at, last_login_at, settings, preferences, google_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Require admin role
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);

      // Validate user ID is an integer (not UUID)
      const userId = parseInt(decoded.id, 10);
      if (Number.isInteger(userId)) {
        const result = await query(
          `SELECT id, email, full_name, role, phone, profile_image,
                  created_at, last_login_at, settings, preferences, google_id
           FROM users WHERE id = $1`,
          [userId]
        );
        if (result.rows.length > 0) {
          req.user = result.rows[0];
        }
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}
