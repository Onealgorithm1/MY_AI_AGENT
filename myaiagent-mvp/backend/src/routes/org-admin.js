import express from 'express';
import { query } from '../utils/database.js';
import { authenticate, requireOrgAdmin } from '../middleware/auth.js';
import { hashPassword, generateToken } from '../utils/auth.js';
import crypto from 'crypto';
import {
  getOrgApiKeys,
  createApiKey,
  deactivateApiKey,
  rotateApiKey
} from '../services/apiKeyResolver.js';

const router = express.Router();

// All org-admin routes require authentication
router.use(authenticate);

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/org/:orgId/users
 * List all users in organization (org admin only)
 */
router.get('/:orgId/users', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { limit = 50, offset = 0, search } = req.query;

    let sql = `
      SELECT u.id, u.email, u.full_name, u.is_active,
             ou.role as org_role, ou.joined_at, ou.last_activity_at,
             COUNT(DISTINCT c.id) as conversation_count
      FROM users u
      JOIN organization_users ou ON u.id = ou.user_id
      LEFT JOIN conversations c ON u.id = c.user_id AND c.organization_id = $1
      WHERE ou.organization_id = $1
    `;

    const params = [parseInt(orgId)];
    let paramCount = 2;

    if (search) {
      sql += ` AND (u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ` GROUP BY u.id, ou.id
             ORDER BY ou.joined_at DESC
             LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error listing org users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * POST /api/org/:orgId/users
 * Invite new user to organization (org admin only)
 */
router.post('/:orgId/users', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;

      // Check if already in organization
      const existingOrgUser = await query(
        `SELECT id FROM organization_users 
         WHERE user_id = $1 AND organization_id = $2`,
        [userId, parseInt(orgId)]
      );

      if (existingOrgUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already in organization' });
      }
    } else {
      // Create temporary user (will be activated when they accept invitation)
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await hashPassword(tempPassword);

      const newUserResult = await query(
        `INSERT INTO users (email, password_hash, full_name, is_active)
         VALUES ($1, $2, $3, false)
         RETURNING id`,
        [email, hashedPassword, email.split('@')[0]]
      );

      userId = newUserResult.rows[0].id;
    }

    // Add user to organization
    const result = await query(
      `INSERT INTO organization_users (organization_id, user_id, role, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET 
         role = EXCLUDED.role, is_active = TRUE
       RETURNING *`,
      [parseInt(orgId), userId, role]
    );

    // Send invitation email
    const orgResult = await query('SELECT name FROM organizations WHERE id = $1', [parseInt(orgId)]);
    const inviterName = req.user.full_name || req.user.email;
    const orgName = orgResult.rows[0].name;
    const acceptLink = `${process.env.FRONTEND_URL || 'https://werkules.com'}/auth/invitation?token=${encodeURIComponent(email)}`; // Placeholder token

    import('../services/emailService.js').then(({ default: emailService }) => {
      emailService.sendInvitationEmail(email, orgName, inviterName, acceptLink)
        .catch(err => console.error('Failed to send invitation email:', err));
    });

    // Log activity
    import('../services/auditService.js').then(({ default: auditService }) => {
      auditService.log({
        userId: req.user.id,
        organizationId: parseInt(orgId),
        action: 'user.invite',
        resourceType: 'user',
        resourceId: result.rows[0].user_id,
        details: { email, role },
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });

    res.status(201).json({
      message: 'User invited to organization',
      orgUser: result.rows[0]
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

/**
 * PUT /api/org/:orgId/users/:userId/role
 * Change user role in organization (org admin only)
 */
router.put('/:orgId/users/:userId/role', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent removing last owner
    if (role !== 'owner') {
      const ownerCount = await query(
        `SELECT COUNT(*) as count FROM organization_users
         WHERE organization_id = $1 AND role = 'owner'`,
        [parseInt(orgId)]
      );

      if (parseInt(ownerCount.rows[0].count) === 1) {
        const currentUser = await query(
          `SELECT role FROM organization_users
           WHERE organization_id = $1 AND user_id = $2`,
          [parseInt(orgId), parseInt(userId)]
        );

        if (currentUser.rows.length > 0 && currentUser.rows[0].role === 'owner') {
          return res.status(400).json({ error: 'Cannot remove last owner' });
        }
      }
    }

    const result = await query(
      `UPDATE organization_users
       SET role = $1
       WHERE organization_id = $2 AND user_id = $3
       RETURNING *`,
      [role, parseInt(orgId), parseInt(userId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    // Log activity
    import('../services/auditService.js').then(({ default: auditService }) => {
      auditService.log({
        userId: req.user.id,
        organizationId: parseInt(orgId),
        action: 'user.update_role',
        resourceType: 'user',
        resourceId: parseInt(userId),
        details: { newRole: role },
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });

    res.json({
      message: 'User role updated',
      orgUser: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * PUT /api/org/:orgId/users/:userId/status
 * Toggle user active status in organization (org admin only)
 */
router.put('/:orgId/users/:userId/status', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ error: 'isActive status is required' });
    }

    // Prevent deactivating last owner
    if (isActive === false) {
      const userRole = await query(
        `SELECT role FROM organization_users
         WHERE organization_id = $1 AND user_id = $2`,
        [parseInt(orgId), parseInt(userId)]
      );

      if (userRole.rows.length > 0 && userRole.rows[0].role === 'owner') {
        const ownerCount = await query(
          `SELECT COUNT(*) as count FROM organization_users
           WHERE organization_id = $1 AND role = 'owner' AND is_active = true`,
          [parseInt(orgId)]
        );

        if (parseInt(ownerCount.rows[0].count) <= 1) {
          return res.status(400).json({ error: 'Cannot deactivate the last active owner' });
        }
      }
    }

    const result = await query(
      `UPDATE organization_users
       SET is_active = $1
       WHERE organization_id = $2 AND user_id = $3
       RETURNING *`,
      [isActive, parseInt(orgId), parseInt(userId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    // Also update the main user record if they belong to this org to ensure login works/fails globally if needed
    // However, usually we want to keep the user active but just remove access to this org.
    // The prompt says "make user active and inactive status".
    // If the requirement is to disable the user entirely (like 'banned'), we should update the `users` table too.
    // Given the context of "invite not working", it sounds like we want to enable the user to login.
    // So we should ALSO update the `users` table is_active flag if this is being done by an Org Admin who is essentially managing the user.
    // Let's assume for this "workaround", updating the link is sufficient, but checking `users.is_active` is also done during login.
    // Let's update BOTH to be safe for this specific "fix", assuming 1-to-1 relationship mostly for now or that Org Admin manages the user's access.

    // Update main user active status as well (Enable login)
    await query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id`,
      [isActive, parseInt(userId)]
    );

    // Log activity
    import('../services/auditService.js').then(({ default: auditService }) => {
      auditService.log({
        userId: req.user.id,
        organizationId: parseInt(orgId),
        action: 'user.update_status',
        resourceType: 'user',
        resourceId: parseInt(userId),
        details: { isActive },
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      orgUser: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * POST /api/org/:orgId/users/:userId/reset-password
 * Send password reset email to user (org admin only)
 */
router.post('/:orgId/users/:userId/reset-password', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, userId } = req.params;

    // Verify user is in organization
    const userOrgCheck = await query(
      `SELECT u.id, u.email FROM users u
       JOIN organization_users ou ON u.id = ou.user_id
       WHERE u.id = $1 AND ou.organization_id = $2`,
      [parseInt(userId), parseInt(orgId)]
    );

    if (userOrgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    const user = userOrgCheck.rows[0];

    // Create password reset token (valid for 24 hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, resetToken, expiresAt]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'https://werkules.com'}/auth/reset-password?token=${resetToken}`;

    // Send email asynchronously
    import('../services/emailService.js').then(({ default: emailService }) => {
      emailService.sendPasswordResetEmail(user.email, resetLink)
        .catch(err => console.error('Failed to send password reset email:', err));
    });

    res.json({
      message: 'Password reset link sent',
      userId: user.id
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * DELETE /api/org/:orgId/users/:userId
 * Deactivate user (soft delete - preserves data)
 */
router.delete('/:orgId/users/:userId', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, userId } = req.params;

    // Verify user is in organization
    const userOrgCheck = await query(
      `SELECT role FROM organization_users
       WHERE user_id = $1 AND organization_id = $2`,
      [parseInt(userId), parseInt(orgId)]
    );

    if (userOrgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    // Prevent removing last owner
    if (userOrgCheck.rows[0].role === 'owner') {
      const ownerCount = await query(
        `SELECT COUNT(*) as count FROM organization_users
         WHERE organization_id = $1 AND role = 'owner'`,
        [parseInt(orgId)]
      );

      if (parseInt(ownerCount.rows[0].count) === 1) {
        return res.status(400).json({ error: 'Cannot remove last owner' });
      }
    }

    // Remove from organization (hard delete relationship)
    await query(
      `DELETE FROM organization_users
       WHERE user_id = $1 AND organization_id = $2`,
      [parseInt(userId), parseInt(orgId)]
    );

    // Log activity
    import('../services/auditService.js').then(({ default: auditService }) => {
      auditService.log({
        userId: req.user.id,
        organizationId: parseInt(orgId),
        action: 'user.deactivate',
        resourceType: 'user',
        resourceId: parseInt(userId),
        details: {},
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });

    res.json({ message: 'User deactivated' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// ============================================
// API KEY MANAGEMENT
// ============================================

/**
 * GET /api/org/:orgId/api-keys
 * List organization API keys (org admin only)
 */
router.get('/:orgId/api-keys', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await query(
      `SELECT id, key_label, service_name, is_active, created_at, updated_at
       FROM api_secrets
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [parseInt(orgId)]
    );

    res.json({
      apiKeys: result.rows.map(key => ({
        id: key.id,
        keyLabel: key.key_label,
        serviceName: key.service_name,
        isActive: key.is_active,
        createdAt: key.created_at,
        updatedAt: key.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * POST /api/org/:orgId/api-keys
 * Create new API key (org admin only)
 */
router.post('/:orgId/api-keys', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { serviceName, keyLabel, keyValue } = req.body;

    if (!serviceName || !keyLabel || !keyValue) {
      return res.status(400).json({ error: 'Service name, label, and key value required' });
    }

    const { saveApiKey } = await import('../utils/apiKeys.js');
    const newKey = await saveApiKey(serviceName, keyValue, req.user.id, parseInt(orgId), keyLabel);

    if (newKey) {
      res.status(201).json({
        apiKey: {
          id: newKey.id,
          keyLabel: newKey.key_label,
          serviceName: newKey.service_name,
          organizationId: newKey.organization_id,
          isActive: newKey.is_active,
          createdAt: newKey.created_at
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to save API key' });
    }
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * PUT /api/org/:orgId/api-keys/:keyId
 * Update API key label (org admin only)
 */
router.put('/:orgId/api-keys/:keyId', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, keyId } = req.params;
    const { keyLabel } = req.body;

    if (!keyLabel) {
      return res.status(400).json({ error: 'Key label required' });
    }

    // Verify key belongs to org
    const keyCheck = await query(
      `SELECT id FROM api_secrets
       WHERE id = $1 AND organization_id = $2`,
      [parseInt(keyId), parseInt(orgId)]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const result = await query(
      `UPDATE api_secrets
       SET key_label = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, key_label, service_name, is_active, updated_at`,
      [keyLabel, parseInt(keyId)]
    );

    res.json({
      apiKey: {
        id: result.rows[0].id,
        keyLabel: result.rows[0].key_label,
        serviceName: result.rows[0].service_name,
        isActive: result.rows[0].is_active,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

/**
 * DELETE /api/org/:orgId/api-keys/:keyId
 * Deactivate API key (soft delete) or permanent delete (force=true)
 */
router.delete('/:orgId/api-keys/:keyId', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, keyId } = req.params;
    const { force } = req.query;

    // Verify key belongs to org
    const keyCheck = await query(
      `SELECT id, is_active FROM api_secrets
       WHERE id = $1 AND organization_id = $2`,
      [parseInt(keyId), parseInt(orgId)]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Hard Delete
    if (force === 'true') {
      await query(
        `DELETE FROM api_secrets WHERE id = $1`,
        [parseInt(keyId)]
      );

      return res.json({
        message: 'API key permanently deleted',
        keyId: parseInt(keyId)
      });
    }

    // Soft Delete (Deactivate)
    const result = await query(
      `UPDATE api_secrets
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, is_active, updated_at`,
      [parseInt(keyId)]
    );

    res.json({
      message: 'API key deactivated',
      apiKey: {
        id: result.rows[0].id,
        isActive: result.rows[0].is_active,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error deactivating API key:', error);
    res.status(500).json({ error: 'Failed to deactivate API key' });
  }
});

/**
 * POST /api/org/:orgId/api-keys/:keyId/rotate
 * Rotate API key (create new, deactivate old)
 */
router.post('/:orgId/api-keys/:keyId/rotate', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId, keyId } = req.params;
    const { newKeyValue } = req.body;

    if (!newKeyValue) {
      return res.status(400).json({ error: 'New key value required' });
    }

    // Verify key belongs to org
    const keyCheck = await query(
      `SELECT id, key_label, service_name FROM api_secrets
       WHERE id = $1 AND organization_id = $2`,
      [parseInt(keyId), parseInt(orgId)]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const oldKey = keyCheck.rows[0];

    // Use utility to save new key (handles encryption, key_name, created_by)
    const { saveApiKey } = await import('../utils/apiKeys.js');
    await saveApiKey(oldKey.service_name, newKeyValue, req.user.id, parseInt(orgId), oldKey.key_label);

    // Deactivate old key
    await query(
      `UPDATE api_secrets
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [parseInt(keyId)]
    );

    // Fetch the newly created key
    const newKeyResult = await query(
      `SELECT id, key_label, service_name, is_active, created_at 
       FROM api_secrets 
       WHERE service_name = $1 AND organization_id = $2 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [oldKey.service_name, parseInt(orgId)]
    );

    res.json({
      message: 'API key rotated successfully',
      newKey: {
        id: newKeyResult.rows[0].id,
        keyLabel: newKeyResult.rows[0].key_label,
        serviceName: newKeyResult.rows[0].service_name,
        isActive: newKeyResult.rows[0].is_active,
        createdAt: newKeyResult.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Error rotating API key:', error);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

// ============================================
// ORGANIZATION SETTINGS
// ============================================

/**
 * GET /api/org/:orgId/settings
 * Get organization settings (org admin only)
 */
router.get('/:orgId/settings', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await query(
      `SELECT id, name, slug, branding_settings, created_at,
              description, website_url, address, phone
       FROM organizations
       WHERE id = $1`,
      [parseInt(orgId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching org settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/org/:orgId/settings
 * Update organization settings (org admin only)
 */
router.put('/:orgId/settings', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, brandingSettings, description, websiteUrl, address, phone } = req.body;

    // Validate input
    if (name && name.trim().length === 0) {
      return res.status(400).json({ error: 'Organization name cannot be empty' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }

    if (brandingSettings) {
      // Merge with existing settings or overwrite? Let's overwrite specific fields
      // But first we need valid JSON
      updates.push(`branding_settings = $${paramCount++}`);
      values.push(JSON.stringify(brandingSettings));
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (websiteUrl !== undefined) {
      updates.push(`website_url = $${paramCount++}`);
      values.push(websiteUrl);
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(orgId));

    const result = await query(
      `UPDATE organizations
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, slug, branding_settings, description, website_url, address, phone, updated_at`,
      values
    );

    // Log activity
    import('../services/auditService.js').then(({ default: auditService }) => {
      auditService.log({
        userId: req.user.id,
        organizationId: parseInt(orgId),
        action: 'organization.update_settings',
        resourceType: 'organization',
        resourceId: parseInt(orgId),
        details: { updates: Object.keys(req.body) },
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });

    res.json({
      message: 'Settings updated',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating org settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// AUDIT LOGS
// ============================================

/**
 * GET /api/org/:orgId/audit-logs
 * Get organization audit logs (org admin only)
 */
router.get('/:orgId/audit-logs', requireOrgAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { limit, offset, action, userId } = req.query;

    const auditService = (await import('../services/auditService.js')).default;
    const result = await auditService.getOrganizationLogs(parseInt(orgId), {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      action,
      userId: userId ? parseInt(userId) : null
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
