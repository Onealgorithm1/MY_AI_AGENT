import express from 'express';
import { authenticate, requireAdmin, requireOrgAccess, requireOrgAdmin } from '../middleware/auth.js';
import { query } from '../utils/database.js';
import { hashPassword, generateToken } from '../utils/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Generate random token
function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================
// Organization Management
// ============================================

// Get user's organizations
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.id, o.name, o.slug, o.logo_url, o.description, o.is_active,
              ou.role as user_role, ou.joined_at
       FROM organizations o
       JOIN organization_users ou ON o.id = ou.organization_id
       WHERE ou.user_id = $1 AND ou.is_active = TRUE AND o.is_active = TRUE
       ORDER BY ou.joined_at DESC`,
      [req.user.id]
    );

    res.json({
      organizations: result.rows,
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization details with stats
router.get('/:orgId', authenticate, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    // Verify user has access to this organization
    const accessCheck = await query(
      `SELECT ou.role as user_role FROM organization_users ou
       WHERE ou.user_id = $1 AND ou.organization_id = $2 AND ou.is_active = TRUE`,
      [req.user.id, orgId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    const result = await query(
      `SELECT id, name, slug, logo_url, description, website_url, industry, size,
              owner_id, is_active, created_at, updated_at, settings
       FROM organizations WHERE id = $1 AND is_active = TRUE`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = result.rows[0];

    // Get member count
    const memberResult = await query(
      'SELECT COUNT(*) as count FROM organization_users WHERE organization_id = $1 AND is_active = TRUE',
      [orgId]
    );

    // Get conversation count
    const conversationResult = await query(
      'SELECT COUNT(*) as count FROM conversations WHERE organization_id = $1',
      [orgId]
    );

    // Get API key count
    const apiKeyResult = await query(
      'SELECT COUNT(*) as count FROM api_secrets WHERE (organization_id = $1 OR organization_id IS NULL) AND is_active = TRUE',
      [orgId]
    );

    res.json({
      organization: {
        ...organization,
        stats: {
          memberCount: parseInt(memberResult.rows[0].count) || 0,
          conversationCount: parseInt(conversationResult.rows[0].count) || 0,
          apiKeyCount: parseInt(apiKeyResult.rows[0].count) || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create new organization
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, website_url, industry, size } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check if slug exists
    const existing = await query(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Organization with this name already exists' });
    }

    // Create organization
    const result = await query(
      `INSERT INTO organizations (name, slug, description, website_url, industry, size, owner_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, name, slug, description, website_url, industry, size, owner_id, created_at`,
      [name, slug, description || null, website_url || null, industry || null, size || null, req.user.id]
    );

    const organization = result.rows[0];

    // Add user as owner
    await query(
      `INSERT INTO organization_users (organization_id, user_id, role, is_active)
       VALUES ($1, $2, 'owner', true)`,
      [organization.id, req.user.id]
    );

    res.status(201).json({
      status: 'success',
      message: 'Organization created successfully',
      organization,
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization
router.put('/:orgId', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { name, description, website_url, industry, size, logo_url } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (website_url !== undefined) {
      updates.push(`website_url = $${paramCount++}`);
      values.push(website_url);
    }

    if (industry !== undefined) {
      updates.push(`industry = $${paramCount++}`);
      values.push(industry);
    }

    if (size !== undefined) {
      updates.push(`size = $${paramCount++}`);
      values.push(size);
    }

    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logo_url);
    }

    if (req.body.uei !== undefined) {
      updates.push(`uei = $${paramCount++}`);
      values.push(req.body.uei);
    }

    if (req.body.cage_code !== undefined) {
      updates.push(`cage_code = $${paramCount++}`);
      values.push(req.body.cage_code);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(orgId);

    const result = await query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      status: 'success',
      message: 'Organization updated successfully',
      organization: result.rows[0],
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// ============================================
// Organization Users Management
// ============================================

// Get organization users
router.get('/:orgId/users', authenticate, requireOrgAccess, async (req, res) => {
  try {
    const result = await query(
      `SELECT ou.id, ou.user_id, ou.role, ou.is_active, ou.joined_at, ou.last_activity_at,
              u.email, u.full_name, u.avatar_url
       FROM organization_users ou
       JOIN users u ON ou.user_id = u.id
       WHERE ou.organization_id = $1
       ORDER BY ou.role DESC, ou.joined_at ASC`,
      [parseInt(req.params.orgId)]
    );

    res.json({
      users: result.rows,
    });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to fetch organization users' });
  }
});

// Invite user to organization
router.post('/:orgId/invitations', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!['member', 'admin', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already in organization
    const existing = await query(
      `SELECT id FROM organization_users 
       WHERE organization_id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)`,
      [orgId, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already a member of this organization' });
    }

    // Check if invitation already exists
    const inviteExisting = await query(
      `SELECT id FROM organization_invitations 
       WHERE organization_id = $1 AND email = $2 AND status = 'pending'`,
      [orgId, email]
    );

    if (inviteExisting.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await query(
      `INSERT INTO organization_invitations (organization_id, email, role, token, invited_by, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, token, expires_at`,
      [orgId, email, role, token, req.user.id, expiresAt]
    );

    const invitation = result.rows[0];

    res.status(201).json({
      status: 'success',
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email,
        role,
        expiresAt: invitation.expires_at,
        inviteLink: `${process.env.FRONTEND_URL}/accept-invitation/${invitation.token}`,
      },
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Accept invitation
router.post('/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const inviteResult = await query(
      `SELECT id, organization_id, email, role, expires_at, status
       FROM organization_invitations
       WHERE token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = inviteResult.rows[0];

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation already accepted or expired' });
    }

    if (new Date() > new Date(invitation.expires_at)) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Get or create user if email matches
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [invitation.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'No user found with this email. Please sign up first.' });
    }

    const userId = userResult.rows[0].id;

    // Add user to organization
    await query(
      `INSERT INTO organization_users (organization_id, user_id, role, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET is_active = true, role = $3`,
      [invitation.organization_id, userId, invitation.role]
    );

    // Mark invitation as accepted
    await query(
      `UPDATE organization_invitations SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [invitation.id]
    );

    res.json({
      status: 'success',
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Get pending invitations for organization
router.get('/:orgId/invitations', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, role, invited_at, expires_at, status, invited_by
       FROM organization_invitations
       WHERE organization_id = $1
       ORDER BY invited_at DESC`,
      [parseInt(req.params.orgId)]
    );

    res.json({
      invitations: result.rows,
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Revoke invitation
router.delete('/:orgId/invitations/:invitationId', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const invitationId = parseInt(req.params.invitationId);

    await query(
      `DELETE FROM organization_invitations
       WHERE id = $1 AND organization_id = $2`,
      [invitationId, orgId]
    );

    res.json({
      status: 'success',
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: 'Failed to revoke invitation' });
  }
});

// Deactivate user in organization
router.put('/:orgId/users/:userId/deactivate', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const userId = parseInt(req.params.userId);

    // Prevent deactivating self
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    // Prevent deactivating owner
    const targetUser = await query(
      `SELECT role FROM organization_users
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    if (targetUser.rows[0].role === 'owner') {
      return res.status(400).json({ error: 'Cannot deactivate organization owner' });
    }

    await query(
      `UPDATE organization_users SET is_active = false
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );

    res.json({
      status: 'success',
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Activate user in organization
router.put('/:orgId/users/:userId/activate', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const userId = parseInt(req.params.userId);

    await query(
      `UPDATE organization_users SET is_active = true
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );

    res.json({
      status: 'success',
      message: 'User activated successfully',
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Update user role in organization
router.put('/:orgId/users/:userId/role', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const userId = parseInt(req.params.userId);
    const { role } = req.body;

    if (!['member', 'admin', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent changing self from admin to member
    if (userId === req.user.id && req.user.org_role === 'admin' && role === 'member') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    // Check if changing owner
    const targetUser = await query(
      `SELECT ou.role FROM organization_users ou
       WHERE ou.organization_id = $1 AND ou.user_id = $2`,
      [orgId, userId]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    if (targetUser.rows[0].role === 'owner' && role !== 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    await query(
      `UPDATE organization_users SET role = $1
       WHERE organization_id = $2 AND user_id = $3`,
      [role, orgId, userId]
    );

    res.json({
      status: 'success',
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Remove user from organization
router.delete('/:orgId/users/:userId', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const userId = parseInt(req.params.userId);

    // Prevent removing self
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself from organization' });
    }

    // Prevent removing owner
    const targetUser = await query(
      `SELECT role FROM organization_users
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in organization' });
    }

    if (targetUser.rows[0].role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    await query(
      `DELETE FROM organization_users
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );

    res.json({
      status: 'success',
      message: 'User removed successfully',
    });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// ============================================
// Password Reset
// ============================================

// Request password reset
router.post('/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({
        status: 'success',
        message: 'If the email exists, a reset link has been sent',
      });
    }

    const userId = userResult.rows[0].id;

    // Invalidate previous tokens
    await query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    res.json({
      status: 'success',
      message: 'Password reset link has been sent to your email',
      resetLink: `${process.env.FRONTEND_URL}/reset-password/${token}`,
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/password-reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify token
    const tokenResult = await query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const userId = tokenResult.rows[0].user_id;

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );

    // Mark token as used
    await query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );

    res.json({
      status: 'success',
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ============================================
// API Key Management (Organization-level)
// ============================================

// Get organization API keys
router.get('/:orgId/api-keys', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    const result = await query(
      `SELECT id, service_name, key_label, is_active, key_type, created_at, updated_at
       FROM api_secrets
       WHERE (organization_id = $1 OR organization_id IS NULL) AND is_active = TRUE
       ORDER BY created_at DESC`,
      [orgId]
    );

    res.json({
      apiKeys: result.rows.map(key => ({
        id: key.id,
        serviceName: key.service_name,
        keyLabel: key.key_label,
        isActive: key.is_active,
        keyType: key.key_type,
        createdAt: key.created_at,
        updatedAt: key.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get organization API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create organization API key
router.post('/:orgId/api-keys', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const { serviceName, keyLabel, keyValue } = req.body;

    if (!serviceName || !keyLabel || !keyValue) {
      return res.status(400).json({ error: 'Service name, label, and key value are required' });
    }

    const result = await query(
      `INSERT INTO api_secrets (organization_id, service_name, key_label, key_value, is_active, key_type)
       VALUES ($1, $2, $3, $4, true, 'api_key')
       RETURNING id, service_name, key_label, is_active, created_at`,
      [orgId, serviceName, keyLabel, keyValue]
    );

    res.json({
      status: 'success',
      apiKey: {
        id: result.rows[0].id,
        serviceName: result.rows[0].service_name,
        keyLabel: result.rows[0].key_label,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Revoke organization API key
router.delete('/:orgId/api-keys/:keyId', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const keyId = parseInt(req.params.keyId);

    // Verify key belongs to this organization
    const keyCheck = await query(
      'SELECT id FROM api_secrets WHERE id = $1 AND organization_id = $2',
      [keyId, orgId]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await query(
      'UPDATE api_secrets SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [keyId]
    );

    res.json({
      status: 'success',
      message: 'API key revoked',
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Rotate organization API key
router.post('/:orgId/api-keys/:keyId/rotate', authenticate, requireOrgAdmin, async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    const keyId = parseInt(req.params.keyId);
    const { newKeyValue } = req.body;

    if (!newKeyValue) {
      return res.status(400).json({ error: 'New key value is required' });
    }

    // Verify key belongs to this organization
    const keyCheck = await query(
      'SELECT id, key_label, service_name FROM api_secrets WHERE id = $1 AND organization_id = $2',
      [keyId, orgId]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const oldKey = keyCheck.rows[0];

    // Update key value
    await query(
      'UPDATE api_secrets SET key_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newKeyValue, keyId]
    );

    res.json({
      status: 'success',
      message: 'API key rotated successfully',
      apiKey: {
        id: oldKey.id,
        keyLabel: oldKey.key_label,
        serviceName: oldKey.service_name,
      },
    });
  } catch (error) {
    console.error('Rotate API key error:', error);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

export default router;
