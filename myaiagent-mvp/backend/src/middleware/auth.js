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

    // Get user from database with complete profile information
    const result = await query(
      `SELECT id, email, full_name, role, is_active, phone, profile_image,
              created_at, last_login_at, settings, preferences, google_id
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Load user's organization if one was stored in JWT
    if (decoded.organization_id) {
      const orgResult = await query(
        `SELECT ou.organization_id, ou.role as org_role, o.name as org_name, o.slug as org_slug
         FROM organization_users ou
         JOIN organizations o ON o.id = ou.organization_id
         WHERE ou.user_id = $1 AND ou.organization_id = $2 AND ou.is_active = TRUE`,
        [user.id, decoded.organization_id]
      );

      if (orgResult.rows.length > 0) {
        const orgUser = orgResult.rows[0];
        user.organization_id = orgUser.organization_id;
        user.org_role = orgUser.org_role;
        user.org_name = orgUser.org_name;
        user.org_slug = orgUser.org_slug;
      }
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
      const result = await query(
        `SELECT id, email, full_name, role, phone, profile_image, 
                created_at, last_login_at, settings, preferences, google_id 
         FROM users WHERE id = $1`,
        [decoded.id]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}
