import { query } from '../utils/database.js';

/**
 * Resolves which API key to use for a request based on organization context
 * Priority:
 * 1. Organization's specific API key (if user has organization context)
 * 2. System/global API key (fallback for backward compatibility)
 * 3. Environment variable (last resort)
 *
 * @param {Object} req - Express request object with user context
 * @param {string} serviceName - Service name (e.g., 'OpenAI', 'Google APIs')
 * @param {string} envVarName - Environment variable name as fallback
 * @returns {Promise<Object>} API key object {id, key_value, service_name, organization_id}
 */
export async function getApiKeyForRequest(req, serviceName, envVarName = null) {
  try {
    // Try organization-specific API key first (if user has organization context)
    if (req.user && req.user.organization_id) {
      const orgKeyResult = await query(
        `SELECT id, key_value, service_name, organization_id, is_active, created_at
         FROM api_secrets
         WHERE organization_id = $1 
           AND service_name = $2 
           AND is_active = TRUE
         LIMIT 1`,
        [req.user.organization_id, serviceName]
      );

      if (orgKeyResult.rows.length > 0) {
        console.log(`✓ Using organization API key for ${serviceName} (org: ${req.user.organization_id})`);
        return orgKeyResult.rows[0];
      }
    }

    // Fallback to system/global API key (organization_id IS NULL)
    const systemKeyResult = await query(
      `SELECT id, key_value, service_name, organization_id, is_active, created_at
       FROM api_secrets
       WHERE organization_id IS NULL 
         AND service_name = $1 
         AND is_active = TRUE
       LIMIT 1`,
      [serviceName]
    );

    if (systemKeyResult.rows.length > 0) {
      console.log(`✓ Using system API key for ${serviceName}`);
      return systemKeyResult.rows[0];
    }

    // Last resort: environment variable
    if (envVarName && process.env[envVarName]) {
      console.log(`⚠️ Using environment variable ${envVarName} for ${serviceName}`);
      return {
        id: null,
        key_value: process.env[envVarName],
        service_name: serviceName,
        organization_id: null,
        is_active: true,
        source: 'environment'
      };
    }

    // No API key found
    console.error(`❌ No API key found for ${serviceName} (org: ${req.user?.organization_id || 'none'})`);
    throw new Error(`No API key configured for ${serviceName}`);
  } catch (error) {
    console.error(`Error resolving API key for ${serviceName}:`, error);
    throw error;
  }
}

/**
 * Get all active API keys for an organization (admin view)
 * @param {number} organizationId - Organization ID
 * @returns {Promise<Array>} Array of API key objects (masked values)
 */
export async function getOrgApiKeys(organizationId) {
  try {
    const result = await query(
      `SELECT id, key_label, service_name, organization_id, is_active, created_at, updated_at
       FROM api_secrets
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return result.rows;
  } catch (error) {
    console.error(`Error fetching API keys for org ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Get system-wide API keys (master admin view)
 * @returns {Promise<Array>} Array of API key objects (masked values)
 */
export async function getSystemApiKeys() {
  try {
    const result = await query(
      `SELECT a.id, a.key_label, a.service_name, a.organization_id, a.is_active, 
              a.created_at, a.updated_at, o.name as org_name
       FROM api_secrets a
       LEFT JOIN organizations o ON a.organization_id = o.id
       ORDER BY a.organization_id ASC, a.created_at DESC`
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching system API keys:', error);
    throw error;
  }
}

/**
 * Create new API key for organization
 * @param {number} organizationId - Organization ID
 * @param {string} serviceName - Service name
 * @param {string} keyLabel - Human-readable label
 * @param {string} keyValue - API key value
 * @returns {Promise<Object>} Created API key object
 */
export async function createApiKey(organizationId, serviceName, keyLabel, keyValue) {
  try {
    const result = await query(
      `INSERT INTO api_secrets (organization_id, service_name, key_label, key_value, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, key_label, service_name, organization_id, is_active, created_at`,
      [organizationId, serviceName, keyLabel, keyValue]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error creating API key for org ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Deactivate API key (soft delete)
 * @param {number} keyId - API key ID
 * @returns {Promise<Object>} Updated API key object
 */
export async function deactivateApiKey(keyId) {
  try {
    const result = await query(
      `UPDATE api_secrets
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, key_label, service_name, organization_id, is_active, updated_at`,
      [keyId]
    );

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error(`Error deactivating API key ${keyId}:`, error);
    throw error;
  }
}

/**
 * Rotate API key (create new, deactivate old)
 * @param {number} keyId - Old API key ID
 * @param {string} newKeyValue - New API key value
 * @returns {Promise<Object>} New API key object
 */
export async function rotateApiKey(keyId, newKeyValue) {
  try {
    // Get old key details
    const oldKeyResult = await query(
      `SELECT organization_id, service_name, key_label
       FROM api_secrets
       WHERE id = $1`,
      [keyId]
    );

    if (oldKeyResult.rows.length === 0) {
      throw new Error('API key not found');
    }

    const { organization_id, service_name, key_label } = oldKeyResult.rows[0];

    // Create new key
    const newKeyResult = await query(
      `INSERT INTO api_secrets (organization_id, service_name, key_label, key_value, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, key_label, service_name, organization_id, is_active, created_at`,
      [organization_id, service_name, key_label, newKeyValue]
    );

    // Deactivate old key
    await query(
      `UPDATE api_secrets
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [keyId]
    );

    return newKeyResult.rows[0];
  } catch (error) {
    console.error(`Error rotating API key ${keyId}:`, error);
    throw error;
  }
}

export default {
  getApiKeyForRequest,
  getOrgApiKeys,
  getSystemApiKeys,
  createApiKey,
  deactivateApiKey,
  rotateApiKey
};
