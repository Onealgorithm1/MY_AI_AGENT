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

// Require super admin role (system-wide admin) - backward compatible
// Includes: admin, superadmin, and master_admin (new hierarchical role)
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'master_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Require master admin role (system-wide, highest privilege)
// Use this for true system admin operations only
export function requireMasterAdmin(req, res, next) {
  if (req.user.role !== 'master_admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Master admin access required' });
  }
  next();
}

// Require organization membership
export function requireOrgAccess(req, res, next) {
  if (!req.user.organization_id) {
    return res.status(403).json({ error: 'Organization access required' });
  }

  // Optionally check if org matches request parameter
  const orgIdParam = req.params.orgId || req.body?.organization_id;
  if (orgIdParam && parseInt(orgIdParam) !== req.user.organization_id) {
    return res.status(403).json({ error: 'Access denied to this organization' });
  }

  next();
}

// Require organization admin or owner role
export function requireOrgAdmin(req, res, next) {
  if (!req.user.organization_id) {
    return res.status(403).json({ error: 'Organization access required' });
  }

  if (req.user.org_role !== 'admin' && req.user.org_role !== 'owner') {
    return res.status(403).json({ error: 'Organization admin access required' });
  }

  // Check if org matches request parameter
  const orgIdParam = req.params.orgId || req.body?.organization_id;
  if (orgIdParam && parseInt(orgIdParam) !== req.user.organization_id) {
    return res.status(403).json({ error: 'Access denied to this organization' });
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
        const user = result.rows[0];

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
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}
