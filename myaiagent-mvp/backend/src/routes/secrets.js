import express from 'express';
import { query } from '../utils/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { encryptSecret, decryptSecret, maskSecret, validateApiKey } from '../services/secrets.js';
import { cacheControl } from '../middleware/cache.js';

const router = express.Router();

// All routes require admin access
router.use(authenticate, requireAdmin);

// Predefined secret types
const SECRET_DEFINITIONS = {
  OPENAI_API_KEY: {
    service_name: 'OpenAI',
    description: 'OpenAI API key for GPT models, Whisper STT, and TTS',
    placeholder: 'sk-proj-...',
    docs_url: 'https://platform.openai.com/api-keys',
  },
  ANTHROPIC_API_KEY: {
    service_name: 'Anthropic',
    description: 'Anthropic API key for Claude models',
    placeholder: 'sk-ant-...',
    docs_url: 'https://console.anthropic.com/settings/keys',
  },
  GOOGLE_API_KEY: {
    service_name: 'Google APIs',
    description: 'Google API key for various Google Cloud services',
    placeholder: 'AIza...',
    docs_url: 'https://console.cloud.google.com/apis/credentials',
  },
  GOOGLE_SEARCH_API_KEY: {
    service_name: 'Google APIs',
    description: 'Google API key for Custom Search API (enables AI web search)',
    placeholder: 'AIza...',
    docs_url: 'https://developers.google.com/custom-search/v1/overview',
  },
  GOOGLE_SEARCH_ENGINE_ID: {
    service_name: 'Google APIs',
    description: 'Google Custom Search Engine ID (CX parameter for web search)',
    placeholder: 'a1b2c3d4e5f6g7h8i...',
    docs_url: 'https://programmablesearchengine.google.com/',
  },
  STRIPE_SECRET_KEY: {
    service_name: 'Stripe',
    description: 'Stripe secret key for payment processing',
    placeholder: 'sk_live_... or sk_test_...',
    docs_url: 'https://dashboard.stripe.com/apikeys',
  },
};

// Get all available secret definitions
router.get('/definitions', cacheControl(600), async (req, res) => {
  try {
    res.json({
      secrets: Object.entries(SECRET_DEFINITIONS).map(([key, value]) => ({
        keyName: key,
        ...value,
      })),
    });
  } catch (error) {
    console.error('Get secret definitions error:', error);
    res.status(500).json({ error: 'Failed to get secret definitions' });
  }
});

// Get all configured secrets (masked - show last 4 characters)
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, key_name, service_name, key_label, key_type, is_default, 
              description, docs_url, is_active, created_at, updated_at, last_used_at, metadata, key_value
       FROM api_secrets 
       ORDER BY service_name, is_default DESC, key_label`
    );

    // Add masked values showing last 4 characters
    const secrets = result.rows.map(secret => {
      const definition = SECRET_DEFINITIONS[secret.key_name] || {};
      const decryptedValue = decryptSecret(secret.key_value);
      const last4 = decryptedValue.length >= 4 ? decryptedValue.slice(-4) : '••••';
      
      return {
        ...secret,
        key_value: undefined, // Remove encrypted value from response
        maskedValue: `••••${last4}`,
        last4Characters: last4,
        definition,
      };
    });

    res.json({ secrets });
  } catch (error) {
    console.error('Get secrets error:', error);
    res.status(500).json({ error: 'Failed to get secrets' });
  }
});

// Get single secret by ID (masked)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM api_secrets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    const secret = result.rows[0];

    res.json({
      secret: {
        id: secret.id,
        keyName: secret.key_name,
        serviceName: secret.service_name,
        keyLabel: secret.key_label,
        keyType: secret.key_type,
        isDefault: secret.is_default,
        description: secret.description,
        docsUrl: secret.docs_url,
        isActive: secret.is_active,
        maskedValue: maskSecret(decryptSecret(secret.key_value)),
        createdAt: secret.created_at,
        updatedAt: secret.updated_at,
        lastUsedAt: secret.last_used_at,
        metadata: secret.metadata,
      },
    });
  } catch (error) {
    console.error('Get secret error:', error);
    res.status(500).json({ error: 'Failed to get secret' });
  }
});

// Auto-detect key type from key value
function detectKeyType(keyValue) {
  if (!keyValue) return 'other';
  
  if (keyValue.startsWith('sk-proj-')) return 'project';
  if (keyValue.startsWith('sk-admin-')) return 'admin';
  if (keyValue.startsWith('sk-')) return 'project'; // Default for other sk- keys
  
  return 'other';
}

// Create or update secret
router.post('/', async (req, res) => {
  try {
    const { 
      keyName, 
      keyValue, 
      serviceName, 
      description,
      docsUrl,
      isActive = true,
      keyLabel,
      keyType,
      isDefault = false
    } = req.body;

    if (!keyValue) {
      return res.status(400).json({ error: 'keyValue is required' });
    }

    // Get service name from definition or use provided
    const finalServiceName = serviceName || SECRET_DEFINITIONS[keyName]?.service_name || 'Custom';
    const finalDescription = description || SECRET_DEFINITIONS[keyName]?.description || '';
    const finalDocsUrl = docsUrl || SECRET_DEFINITIONS[keyName]?.docs_url || '';
    const finalKeyName = keyName || `${finalServiceName}_API_KEY`;
    
    // Auto-detect key type if not provided
    const finalKeyType = keyType || detectKeyType(keyValue);
    
    // Generate key label if not provided
    const finalKeyLabel = keyLabel || `${finalServiceName} Key`;

    // Validate key format
    if (keyName && !validateApiKey(keyName, keyValue)) {
      return res.status(400).json({ 
        error: 'Invalid API key format',
        hint: SECRET_DEFINITIONS[keyName]?.placeholder,
      });
    }

    // Encrypt the value
    const encryptedValue = encryptSecret(keyValue);

    // If setting as default, unset other defaults for this service
    if (isDefault) {
      await query(
        'UPDATE api_secrets SET is_default = false WHERE service_name = $1',
        [finalServiceName]
      );
    }

    // Upsert secret using (service_name, key_label) uniqueness
    const result = await query(
      `INSERT INTO api_secrets (key_name, key_value, service_name, key_label, key_type, description, docs_url, is_active, is_default, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (service_name, key_label) 
       DO UPDATE SET 
         key_value = EXCLUDED.key_value,
         key_name = EXCLUDED.key_name,
         key_type = EXCLUDED.key_type,
         description = EXCLUDED.description,
         docs_url = EXCLUDED.docs_url,
         is_active = EXCLUDED.is_active,
         is_default = EXCLUDED.is_default,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, key_name, service_name, key_label, key_type, is_active, is_default`,
      [finalKeyName, encryptedValue, finalServiceName, finalKeyLabel, finalKeyType, finalDescription, finalDocsUrl, isActive, isDefault, req.user.id]
    );

    res.status(201).json({
      message: 'Secret saved successfully',
      secret: {
        id: result.rows[0].id,
        keyName: result.rows[0].key_name,
        serviceName: result.rows[0].service_name,
        keyLabel: result.rows[0].key_label,
        keyType: result.rows[0].key_type,
        isActive: result.rows[0].is_active,
        isDefault: result.rows[0].is_default,
      },
    });
  } catch (error) {
    console.error('Save secret error:', error);
    res.status(500).json({ error: 'Failed to save secret' });
  }
});

// Toggle secret active status by ID
router.put('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE api_secrets 
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    res.json({
      message: 'Secret status updated',
      isActive: result.rows[0].is_active,
    });
  } catch (error) {
    console.error('Toggle secret error:', error);
    res.status(500).json({ error: 'Failed to toggle secret' });
  }
});

// Set default key for a service
router.put('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the secret's service name
    const secretResult = await query(
      'SELECT service_name FROM api_secrets WHERE id = $1',
      [id]
    );

    if (secretResult.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    const serviceName = secretResult.rows[0].service_name;

    // Unset all defaults for this service
    await query(
      'UPDATE api_secrets SET is_default = false WHERE service_name = $1',
      [serviceName]
    );

    // Set this one as default
    await query(
      'UPDATE api_secrets SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'Default key updated successfully' });
  } catch (error) {
    console.error('Set default error:', error);
    res.status(500).json({ error: 'Failed to set default key' });
  }
});

// Update category metadata (name and description) without touching key values
router.patch('/category/:serviceName/metadata', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { newServiceName, description } = req.body;

    if (!newServiceName || !newServiceName.trim()) {
      return res.status(400).json({ error: 'New service name is required' });
    }

    // Check if the category exists
    const existingKeys = await query(
      'SELECT id FROM api_secrets WHERE service_name = $1',
      [serviceName]
    );

    if (existingKeys.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Update all keys in this category with new service name and description
    await query(
      `UPDATE api_secrets 
       SET service_name = $1, 
           description = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE service_name = $3`,
      [newServiceName, description || '', serviceName]
    );

    res.json({ 
      message: 'Category metadata updated successfully',
      updatedCount: existingKeys.rows.length 
    });
  } catch (error) {
    console.error('Update category metadata error:', error);
    res.status(500).json({ error: 'Failed to update category metadata' });
  }
});

// Update individual key (label, docs_url, and optionally key value)
router.patch('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const { keyLabel, docsUrl, keyValue } = req.body;

    if (!keyLabel || !keyLabel.trim()) {
      return res.status(400).json({ error: 'Key label is required' });
    }

    // If keyValue is provided, validate and encrypt it
    if (keyValue) {
      // Get the existing secret to get key_name for validation
      const existingSecret = await query(
        'SELECT key_name, key_type FROM api_secrets WHERE id = $1',
        [id]
      );

      if (existingSecret.rows.length === 0) {
        return res.status(404).json({ error: 'Secret not found' });
      }

      const keyName = existingSecret.rows[0].key_name;
      
      // Validate key format if it's a predefined type
      if (keyName && !validateApiKey(keyName, keyValue)) {
        return res.status(400).json({ 
          error: 'Invalid API key format',
          hint: SECRET_DEFINITIONS[keyName]?.placeholder,
        });
      }

      const encryptedValue = encryptSecret(keyValue);
      const keyType = detectKeyType(keyValue);

      // Update with new key value
      const result = await query(
        `UPDATE api_secrets 
         SET key_label = $1,
             docs_url = $2,
             key_value = $3,
             key_type = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, service_name, key_label, docs_url, key_type`,
        [keyLabel, docsUrl || '', encryptedValue, keyType, id]
      );

      res.json({ 
        message: 'API key updated successfully',
        secret: result.rows[0]
      });
    } else {
      // Update only metadata without touching key value
      const result = await query(
        `UPDATE api_secrets 
         SET key_label = $1,
             docs_url = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, service_name, key_label, docs_url`,
        [keyLabel, docsUrl || '', id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Secret not found' });
      }

      res.json({ 
        message: 'Key metadata updated successfully',
        secret: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Update key error:', error);
    res.status(500).json({ error: 'Failed to update key' });
  }
});

// Delete entire category (all keys in a service)
router.delete('/category/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;

    const result = await query(
      'DELETE FROM api_secrets WHERE service_name = $1 RETURNING id',
      [serviceName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No secrets found for this service' });
    }

    res.json({ 
      message: 'Category deleted successfully',
      deletedCount: result.rows.length 
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Delete secret by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM api_secrets WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    res.json({ message: 'Secret deleted successfully' });
  } catch (error) {
    console.error('Delete secret error:', error);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

// Test secret (verify it works) - now uses ID instead of keyName
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, key_name, key_value, service_name, key_type FROM api_secrets WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found or inactive' });
    }

    const secret = result.rows[0];
    const decryptedValue = decryptSecret(secret.key_value);

    // Test based on service
    let testResult = { success: false, message: 'Test not implemented' };

    if (secret.service_name === 'OpenAI') {
      // Test OpenAI key
      const axios = (await import('axios')).default;
      try {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${decryptedValue}` },
        });
        testResult = { 
          success: true, 
          message: `OpenAI API key is valid (${secret.key_type} key)`, 
          models: response.data.data.length,
          keyType: secret.key_type 
        };
      } catch (error) {
        testResult = { 
          success: false, 
          message: error.response?.data?.error?.message || 'Invalid API key',
          hint: secret.key_type === 'admin' ? 'Admin keys cannot access model endpoints. Use a project key (sk-proj-) for chat.' : undefined
        };
      }
    } else if (secret.service_name === 'Google APIs') {
      // Test Google API key
      const axios = (await import('axios')).default;
      
      if (secret.key_name === 'GOOGLE_SEARCH_API_KEY') {
        // Test Google Custom Search API key
        try {
          // Get the search engine ID if it exists
          const engineIdResult = await query(
            `SELECT key_value FROM api_secrets 
             WHERE service_name = 'Google APIs' 
             AND key_name = 'GOOGLE_SEARCH_ENGINE_ID' 
             AND is_active = true 
             LIMIT 1`
          );

          if (engineIdResult.rows.length === 0) {
            testResult = { 
              success: false, 
              message: 'GOOGLE_SEARCH_ENGINE_ID not found. Both API Key and Engine ID are required for Custom Search.',
              hint: 'Add a GOOGLE_SEARCH_ENGINE_ID key to complete the setup.'
            };
          } else {
            const engineId = decryptSecret(engineIdResult.rows[0].key_value);
            
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
              params: {
                key: decryptedValue,
                cx: engineId,
                q: 'test',
                num: 1
              },
              timeout: 10000
            });
            
            testResult = { 
              success: true, 
              message: 'Google Custom Search API key is valid',
              quota: response.data.searchInformation?.totalResults || 'Available'
            };
          }
        } catch (error) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Invalid API key';
          testResult = { 
            success: false, 
            message: errorMessage,
            hint: error.response?.status === 429 ? 'API quota exceeded' : 'Check your API key and ensure Custom Search API is enabled in Google Cloud Console'
          };
        }
      } else if (secret.key_name === 'GOOGLE_SEARCH_ENGINE_ID') {
        // Test Google Search Engine ID by checking if it's paired with an API key
        const apiKeyResult = await query(
          `SELECT id FROM api_secrets 
           WHERE service_name = 'Google APIs' 
           AND key_name = 'GOOGLE_SEARCH_API_KEY' 
           AND is_active = true 
           LIMIT 1`
        );

        if (apiKeyResult.rows.length === 0) {
          testResult = { 
            success: false, 
            message: 'Search Engine ID saved, but GOOGLE_SEARCH_API_KEY not found.',
            hint: 'Add a GOOGLE_SEARCH_API_KEY to complete the setup.'
          };
        } else {
          testResult = { 
            success: true, 
            message: 'Search Engine ID is configured (requires API key for full validation)',
            hint: 'Test the GOOGLE_SEARCH_API_KEY for complete validation.'
          };
        }
      } else if (secret.key_name === 'GOOGLE_API_KEY') {
        // Generic Google API key - test with a simple API endpoint
        try {
          const response = await axios.get('https://www.googleapis.com/discovery/v1/apis', {
            params: {
              key: decryptedValue
            },
            timeout: 10000
          });
          
          testResult = { 
            success: true, 
            message: 'Google API key is valid',
            apis: response.data.items?.length || 'Available'
          };
        } catch (error) {
          const errorMessage = error.response?.data?.error?.message || error.message || 'Invalid API key';
          testResult = { 
            success: false, 
            message: errorMessage,
            hint: 'Ensure the API key is valid and has proper permissions in Google Cloud Console'
          };
        }
      }
    } else if (secret.service_name === 'Anthropic') {
      // Test Anthropic API key
      const axios = (await import('axios')).default;
      try {
        const response = await axios.get('https://api.anthropic.com/v1/messages', {
          headers: { 
            'x-api-key': decryptedValue,
            'anthropic-version': '2023-06-01'
          },
        });
        testResult = { success: true, message: 'Anthropic API key is valid' };
      } catch (error) {
        if (error.response?.status === 401) {
          testResult = { success: false, message: 'Invalid Anthropic API key' };
        } else if (error.response?.status === 400) {
          testResult = { success: true, message: 'Anthropic API key is valid' };
        } else {
          testResult = { success: false, message: error.response?.data?.error?.message || 'API test failed' };
        }
      }
    } else if (secret.service_name === 'Stripe') {
      // Test Stripe API key
      const axios = (await import('axios')).default;
      try {
        const response = await axios.get('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${decryptedValue}` },
        });
        testResult = { success: true, message: 'Stripe API key is valid', keyType: secret.key_type };
      } catch (error) {
        testResult = { 
          success: false, 
          message: error.response?.data?.error?.message || 'Invalid API key'
        };
      }
    } else if (secret.service_name === 'Google') {
      // Test Google Cloud API key or service account
      testResult = { success: true, message: 'Google credentials configured' };
    }

    // Update last_used_at
    await query(
      'UPDATE api_secrets SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      id: secret.id,
      keyName: secret.key_name,
      serviceName: secret.service_name,
      keyType: secret.key_type,
      tested: true,
      ...testResult,
    });
  } catch (error) {
    console.error('Test secret error:', error);
    res.status(500).json({ error: 'Failed to test secret' });
  }
});

export default router;
