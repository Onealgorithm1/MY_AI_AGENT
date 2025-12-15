import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../utils/database.js';
import { authenticate } from '../middleware/auth.js';
import { encryptSecret, decryptSecret, maskSecret } from '../services/secrets.js';
import { cacheControl } from '../middleware/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// HELPER: Map API service names to provider names
// ============================================
const SERVICE_TO_PROVIDER_MAP = {
  'OpenAI': 'openai',
  'Anthropic': 'anthropic',
  'Google APIs': 'google',
  'Google Cloud': 'google',
  'Google OAuth': 'google',
  'Cohere': 'cohere',
  'Groq': 'groq',
  'ElevenLabs': 'elevenlabs',
  'SAM.gov': 'sam-gov',
  'Stripe': 'stripe',
};

// ============================================
// AI PROVIDERS ROUTES
// ============================================

// Get available AI providers based on configured API keys
router.get('/available-providers', async (req, res) => {
  try {
    // Ensure AI Agent tables exist
    const tablesInitialized = await initializeAIAgentTables();
    if (!tablesInitialized) {
      return res.status(500).json({
        error: 'Database initialization failed. Contact your administrator.'
      });
    }

    // Get all configured API services
    const secretsResult = await query(
      `SELECT DISTINCT service_name FROM api_secrets
       WHERE is_active = TRUE
       GROUP BY service_name
       ORDER BY service_name`
    );

    const configuredServices = new Set(
      secretsResult.rows.map(row => row.service_name)
    );

    // Get all available providers
    const providersResult = await query(
      `SELECT id, provider_name, display_name, logo_url, docs_url,
              auth_type, supported_models, config_schema, is_active
       FROM ai_agent_providers
       WHERE is_active = TRUE
       ORDER BY display_name`
    );

    // Filter providers based on configured API keys
    const availableProviders = providersResult.rows
      .filter(provider => {
        // Check if this provider has a configured API key
        for (const [serviceName, providerName] of Object.entries(SERVICE_TO_PROVIDER_MAP)) {
          if (providerName === provider.provider_name && configuredServices.has(serviceName)) {
            return true;
          }
        }
        return false;
      })
      .map(provider => ({
        id: provider.id,
        providerName: provider.provider_name,
        displayName: provider.display_name,
        logoUrl: provider.logo_url,
        docsUrl: provider.docs_url,
        authType: provider.auth_type,
        supportedModels: provider.supported_models || [],
        configSchema: provider.config_schema || {},
        isActive: provider.is_active,
        hasApiKey: true,
      }));

    // Get unavailable providers (for UI to suggest connecting)
    const unavailableProviders = providersResult.rows
      .filter(provider => {
        for (const [serviceName, providerName] of Object.entries(SERVICE_TO_PROVIDER_MAP)) {
          if (providerName === provider.provider_name && configuredServices.has(serviceName)) {
            return false;
          }
        }
        return true;
      })
      .map(provider => ({
        id: provider.id,
        providerName: provider.provider_name,
        displayName: provider.display_name,
        logoUrl: provider.logo_url,
        docsUrl: provider.docs_url,
        authType: provider.auth_type,
        supportedModels: provider.supported_models || [],
        configSchema: provider.config_schema || {},
        isActive: provider.is_active,
        hasApiKey: false,
      }));

    res.json({
      available: availableProviders,
      unavailable: unavailableProviders,
      configuredServices: Array.from(configuredServices),
      summary: {
        availableCount: availableProviders.length,
        unavailableCount: unavailableProviders.length,
        totalConfigured: configuredServices.size,
      },
    });
  } catch (error) {
    console.error('❌ Get available providers error:', error.message);

    // Check if this is a table missing error
    if (error.message?.includes('does not exist')) {
      return res.status(500).json({
        error: 'Database tables not initialized. Please run migrations: npm run migrate'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to get available providers'
    });
  }
});

// Get all available AI providers (unfiltered)
router.get('/providers', cacheControl(3600), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, provider_name, display_name, logo_url, docs_url, 
              auth_type, supported_models, config_schema, is_active
       FROM ai_agent_providers 
       WHERE is_active = TRUE
       ORDER BY display_name`
    );

    const providers = result.rows.map(provider => ({
      id: provider.id,
      providerName: provider.provider_name,
      displayName: provider.display_name,
      logoUrl: provider.logo_url,
      docsUrl: provider.docs_url,
      authType: provider.auth_type,
      supportedModels: provider.supported_models || [],
      configSchema: provider.config_schema || {},
      isActive: provider.is_active,
    }));

    res.json({ providers });
  } catch (error) {
    console.error('Get AI providers error:', error);
    res.status(500).json({ error: 'Failed to get AI providers' });
  }
});

// Get specific provider details
router.get('/providers/:providerName', cacheControl(3600), async (req, res) => {
  try {
    const { providerName } = req.params;

    const result = await query(
      `SELECT id, provider_name, display_name, logo_url, docs_url, 
              base_url, auth_type, oauth_auth_url, oauth_token_url, 
              oauth_scopes, supported_models, config_schema
       FROM ai_agent_providers 
       WHERE provider_name = $1 AND is_active = TRUE`,
      [providerName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = result.rows[0];

    res.json({
      provider: {
        id: provider.id,
        providerName: provider.provider_name,
        displayName: provider.display_name,
        logoUrl: provider.logo_url,
        docsUrl: provider.docs_url,
        baseUrl: provider.base_url,
        authType: provider.auth_type,
        oauthAuthUrl: provider.oauth_auth_url,
        oauthTokenUrl: provider.oauth_token_url,
        oauthScopes: provider.oauth_scopes,
        supportedModels: provider.supported_models || [],
        configSchema: provider.config_schema || {},
      },
    });
  } catch (error) {
    console.error('Get AI provider error:', error);
    res.status(500).json({ error: 'Failed to get AI provider' });
  }
});

// ============================================
// USER AI AGENTS ROUTES
// ============================================

// Get all AI agents for current user
router.get('/my-agents', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT uaa.id, uaa.provider_name, uaa.agent_name, uaa.model,
              uaa.auth_type, uaa.config, uaa.is_active, uaa.is_default,
              uaa.status, uaa.error_message, uaa.last_tested_at,
              uaa.last_used_at, uaa.created_at, uaa.updated_at,
              aap.display_name, aap.logo_url
       FROM user_ai_agents uaa
       JOIN ai_agent_providers aap ON uaa.provider_name = aap.provider_name
       WHERE uaa.user_id = $1
       ORDER BY uaa.is_default DESC, uaa.created_at DESC`,
      [userId]
    );

    const agents = result.rows.map(agent => ({
      id: agent.id,
      providerName: agent.provider_name,
      providerDisplayName: agent.display_name,
      providerLogoUrl: agent.logo_url,
      agentName: agent.agent_name,
      model: agent.model,
      authType: agent.auth_type,
      config: agent.config || {},
      isActive: agent.is_active,
      isDefault: agent.is_default,
      status: agent.status,
      errorMessage: agent.error_message,
      lastTestedAt: agent.last_tested_at,
      lastUsedAt: agent.last_used_at,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }));

    res.json({ agents });
  } catch (error) {
    console.error('❌ Get user AI agents error:', error.message);

    // Check if this is a table missing error
    if (error.message?.includes('does not exist')) {
      return res.status(500).json({
        error: 'Database tables not initialized. Please run migrations: npm run migrate'
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to get AI agents'
    });
  }
});

// Get single AI agent by ID
router.get('/my-agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT uaa.id, uaa.provider_name, uaa.agent_name, uaa.model, 
              uaa.auth_type, uaa.config, uaa.is_active, uaa.is_default,
              uaa.status, uaa.error_message, uaa.last_tested_at, 
              uaa.last_used_at, uaa.created_at, uaa.updated_at,
              aap.display_name, aap.logo_url, aap.supported_models
       FROM user_ai_agents uaa
       JOIN ai_agent_providers aap ON uaa.provider_name = aap.provider_name
       WHERE uaa.id = $1 AND uaa.user_id = $2`,
      [agentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }

    const agent = result.rows[0];

    res.json({
      agent: {
        id: agent.id,
        providerName: agent.provider_name,
        providerDisplayName: agent.display_name,
        providerLogoUrl: agent.logo_url,
        agentName: agent.agent_name,
        model: agent.model,
        authType: agent.auth_type,
        config: agent.config || {},
        isActive: agent.is_active,
        isDefault: agent.is_default,
        status: agent.status,
        errorMessage: agent.error_message,
        lastTestedAt: agent.last_tested_at,
        lastUsedAt: agent.last_used_at,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        supportedModels: agent.supported_models || [],
      },
    });
  } catch (error) {
    console.error('Get AI agent error:', error);
    res.status(500).json({ error: 'Failed to get AI agent' });
  }
});

// Create new AI agent
router.post('/my-agents', async (req, res) => {
  try {
    const {
      providerName,
      agentName,
      model,
      authType = 'api_key',
      apiKey,
      oauthToken,
      config = {},
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!providerName || !agentName || !model) {
      return res.status(400).json({
        error: 'providerName, agentName, and model are required',
      });
    }

    if (authType === 'api_key' && !apiKey) {
      return res.status(400).json({ error: 'apiKey is required for API key auth' });
    }

    if (authType === 'oauth' && !oauthToken) {
      return res.status(400).json({ error: 'oauthToken is required for OAuth auth' });
    }

    // Verify provider exists
    const providerResult = await query(
      'SELECT id FROM ai_agent_providers WHERE provider_name = $1 AND is_active = TRUE',
      [providerName]
    );

    if (providerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    let apiKeyId = null;

    // Create or reuse API secret if needed
    if (authType === 'api_key' && apiKey) {
      const secretKeyName = `${providerName.toUpperCase()}_API_KEY_${Date.now()}`;
      const encryptedKey = encryptSecret(apiKey);

      const secretResult = await query(
        `INSERT INTO api_secrets (key_name, key_value, key_type, service_name, 
                                  key_label, description, is_active, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          secretKeyName,
          encryptedKey,
          'api_key',
          providerName,
          `${agentName} API Key`,
          `API key for ${agentName} (${model})`,
          true,
          false,
        ]
      );

      apiKeyId = secretResult.rows[0].id;
    }

    // Prepare OAuth token (encrypted) if provided
    let encryptedOAuthToken = null;
    if (authType === 'oauth' && oauthToken) {
      encryptedOAuthToken = encryptSecret(oauthToken);
    }

    // Insert user AI agent
    const insertResult = await query(
      `INSERT INTO user_ai_agents (user_id, provider_name, agent_name, model, 
                                   api_key_id, oauth_token, auth_type, config, 
                                   is_active, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        userId,
        providerName,
        agentName,
        model,
        apiKeyId,
        encryptedOAuthToken,
        authType,
        JSON.stringify(config),
        true,
        'active',
      ]
    );

    const agentId = insertResult.rows[0].id;

    res.status(201).json({
      agent: {
        id: agentId,
        providerName,
        agentName,
        model,
        authType,
        config,
        isActive: true,
        isDefault: false,
        status: 'active',
        createdAt: insertResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Create AI agent error:', error);

    if (error.message?.includes('unique')) {
      return res.status(400).json({
        error: 'An agent with this name already exists for this provider',
      });
    }

    res.status(500).json({ error: 'Failed to create AI agent' });
  }
});

// Update AI agent
router.put('/my-agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;
    const {
      agentName,
      model,
      config = {},
      isActive,
      apiKey,
    } = req.body;

    // Verify agent belongs to user
    const agentResult = await query(
      `SELECT id, api_key_id, auth_type FROM user_ai_agents 
       WHERE id = $1 AND user_id = $2`,
      [agentId, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }

    const agent = agentResult.rows[0];
    let newApiKeyId = agent.api_key_id;

    // Update API key if provided
    if (apiKey && agent.auth_type === 'api_key') {
      // Delete old API secret if exists
      if (agent.api_key_id) {
        await query('DELETE FROM api_secrets WHERE id = $1', [agent.api_key_id]);
      }

      // Create new API secret
      const secretKeyName = `USER_AGENT_API_KEY_${agentId}_${Date.now()}`;
      const encryptedKey = encryptSecret(apiKey);

      const secretResult = await query(
        `INSERT INTO api_secrets (key_name, key_value, key_type, is_active, is_default)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          secretKeyName,
          encryptedKey,
          'api_key',
          true,
          false,
        ]
      );

      newApiKeyId = secretResult.rows[0].id;
    }

    // Update agent
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (agentName !== undefined) {
      updates.push(`agent_name = $${paramCount++}`);
      values.push(agentName);
    }
    if (model !== undefined) {
      updates.push(`model = $${paramCount++}`);
      values.push(model);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(config));
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    if (newApiKeyId !== agent.api_key_id) {
      updates.push(`api_key_id = $${paramCount++}`);
      values.push(newApiKeyId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(agentId);
    values.push(userId);

    const result = await query(
      `UPDATE user_ai_agents 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    const updatedAgent = result.rows[0];

    res.json({
      agent: {
        id: updatedAgent.id,
        providerName: updatedAgent.provider_name,
        agentName: updatedAgent.agent_name,
        model: updatedAgent.model,
        authType: updatedAgent.auth_type,
        config: updatedAgent.config || {},
        isActive: updatedAgent.is_active,
        isDefault: updatedAgent.is_default,
        status: updatedAgent.status,
        updatedAt: updatedAgent.updated_at,
      },
    });
  } catch (error) {
    console.error('Update AI agent error:', error);
    res.status(500).json({ error: 'Failed to update AI agent' });
  }
});

// Delete AI agent
router.delete('/my-agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;

    // Get agent to find API key
    const agentResult = await query(
      `SELECT api_key_id FROM user_ai_agents 
       WHERE id = $1 AND user_id = $2`,
      [agentId, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }

    const { api_key_id } = agentResult.rows[0];

    // Delete API secret if exists
    if (api_key_id) {
      await query('DELETE FROM api_secrets WHERE id = $1', [api_key_id]);
    }

    // Delete agent
    await query(
      'DELETE FROM user_ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, userId]
    );

    res.json({ message: 'AI agent deleted successfully' });
  } catch (error) {
    console.error('Delete AI agent error:', error);
    res.status(500).json({ error: 'Failed to delete AI agent' });
  }
});

// Set default AI agent
router.post('/my-agents/:agentId/set-default', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;

    // Verify agent exists and belongs to user
    const agentResult = await query(
      'SELECT id FROM user_ai_agents WHERE id = $1 AND user_id = $2',
      [agentId, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }

    // Deactivate all other default agents for this user
    await query(
      `UPDATE user_ai_agents SET is_default = FALSE 
       WHERE user_id = $1 AND is_default = TRUE`,
      [userId]
    );

    // Set this agent as default
    const result = await query(
      `UPDATE user_ai_agents SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [agentId, userId]
    );

    res.json({
      agent: {
        id: result.rows[0].id,
        agentName: result.rows[0].agent_name,
        isDefault: true,
      },
    });
  } catch (error) {
    console.error('Set default AI agent error:', error);
    res.status(500).json({ error: 'Failed to set default AI agent' });
  }
});

// Test AI agent connectivity
router.post('/my-agents/:agentId/test', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.user.id;

    // Get agent
    const agentResult = await query(
      `SELECT uaa.*, aap.base_url 
       FROM user_ai_agents uaa
       JOIN ai_agent_providers aap ON uaa.provider_name = aap.provider_name
       WHERE uaa.id = $1 AND uaa.user_id = $2`,
      [agentId, userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'AI agent not found' });
    }

    const agent = agentResult.rows[0];

    let testSuccess = false;
    let testError = null;

    try {
      // Test connectivity based on provider
      const testResult = await testAgentConnectivity(agent);
      testSuccess = testResult.success;
      testError = testResult.error;

      // Update agent status
      await query(
        `UPDATE user_ai_agents 
         SET status = $1, error_message = $2, last_tested_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [testSuccess ? 'active' : 'error', testError, agentId]
      );
    } catch (err) {
      testError = err.message;
      await query(
        `UPDATE user_ai_agents 
         SET status = 'error', error_message = $1, last_tested_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [testError, agentId]
      );
    }

    res.json({
      success: testSuccess,
      status: testSuccess ? 'active' : 'error',
      error: testError,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test AI agent error:', error);
    res.status(500).json({ error: 'Failed to test AI agent' });
  }
});

// ============================================
// DATABASE INITIALIZATION & MAINTENANCE
// ============================================

// Initialize AI Agent tables if they don't exist (called on first request if needed)
async function initializeAIAgentTables() {
  try {
    // Test if tables exist by querying them
    await query('SELECT 1 FROM ai_agent_providers LIMIT 1');
    console.log('✅ AI Agent tables already exist');
    return true;
  } catch (error) {
    if (error.message?.includes('does not exist')) {
      console.warn('⚠️  AI Agent tables not found, attempting to initialize...');

      // Read and execute the migration file
      try {
        const migrationPath = path.join(__dirname, '../../migrations/020_add_user_ai_agents.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await query(migrationSQL);
        console.log('✅ AI Agent tables initialized successfully');
        return true;
      } catch (migrationError) {
        console.error('❌ Failed to initialize AI Agent tables:', migrationError.message);
        return false;
      }
    }
    throw error;
  }
}

// Admin endpoint to manually trigger database initialization
router.post('/admin/init-database', async (req, res) => {
  try {
    // Only allow admins (assuming req.user has role info)
    if (!req.user || (req.user.role !== 'admin' && req.user.email !== 'admin@myaiagent.com')) {
      return res.status(403).json({ error: 'Only admins can initialize the database' });
    }

    const initialized = await initializeAIAgentTables();

    if (initialized) {
      res.json({
        message: 'Database initialized successfully',
        status: 'success'
      });
    } else {
      res.status(500).json({
        error: 'Failed to initialize database. Check server logs for details.',
        status: 'failed'
      });
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      error: 'Database initialization failed: ' + error.message
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function testAgentConnectivity(agent) {
  const { provider_name, api_key_id, oauth_token, base_url, model } = agent;

  try {
    let apiKey = null;
    let authToken = null;

    // Get API key or OAuth token
    if (api_key_id) {
      const keyResult = await query('SELECT key_value FROM api_secrets WHERE id = $1', [api_key_id]);
      if (keyResult.rows.length > 0) {
        apiKey = decryptSecret(keyResult.rows[0].key_value);
      }
    } else if (oauth_token) {
      authToken = decryptSecret(oauth_token);
    }

    // Test based on provider
    if (provider_name === 'openai') {
      return await testOpenAIConnectivity(apiKey);
    } else if (provider_name === 'anthropic') {
      return await testAnthropicConnectivity(apiKey);
    } else if (provider_name === 'google') {
      return await testGoogleConnectivity(apiKey);
    } else if (provider_name === 'cohere') {
      return await testCohereConnectivity(apiKey);
    } else if (provider_name === 'groq') {
      return await testGroqConnectivity(apiKey);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testOpenAIConnectivity(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired API key' };
    }
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testAnthropicConnectivity(apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey },
    });

    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired API key' };
    }
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testGoogleConnectivity(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Invalid or expired API key' };
    }
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testCohereConnectivity(apiKey) {
  try {
    const response = await fetch('https://api.cohere.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired API key' };
    }
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testGroqConnectivity(apiKey) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired API key' };
    }
    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default router;
