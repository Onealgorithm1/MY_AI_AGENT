import express from 'express';
import { query } from '../utils/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { encryptSecret, decryptSecret, maskSecret, validateApiKey } from '../services/secrets.js';

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
  ELEVENLABS_API_KEY: {
    service_name: 'ElevenLabs',
    description: 'ElevenLabs API key for realistic voice synthesis',
    placeholder: 'abc123def456...',
    docs_url: 'https://elevenlabs.io/app/settings/api-keys',
  },
  ANTHROPIC_API_KEY: {
    service_name: 'Anthropic',
    description: 'Anthropic API key for Claude models',
    placeholder: 'sk-ant-...',
    docs_url: 'https://console.anthropic.com/settings/keys',
  },
  GOOGLE_API_KEY: {
    service_name: 'Google',
    description: 'Google API key for various services',
    placeholder: 'AIza...',
    docs_url: 'https://console.cloud.google.com/apis/credentials',
  },
  STRIPE_SECRET_KEY: {
    service_name: 'Stripe',
    description: 'Stripe secret key for payment processing',
    placeholder: 'sk_live_... or sk_test_...',
    docs_url: 'https://dashboard.stripe.com/apikeys',
  },
};

// Get all available secret definitions
router.get('/definitions', async (req, res) => {
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

// Get all configured secrets (masked)
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, key_name, service_name, key_label, key_type, is_default, 
              description, is_active, created_at, updated_at, last_used_at, metadata
       FROM api_secrets 
       ORDER BY service_name, is_default DESC, key_label`
    );

    // Add masked values and definitions
    const secrets = result.rows.map(secret => {
      const definition = SECRET_DEFINITIONS[secret.key_name] || {};
      return {
        ...secret,
        maskedValue: '••••••••••••',
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
      `INSERT INTO api_secrets (key_name, key_value, service_name, key_label, key_type, description, is_active, is_default, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (service_name, key_label) 
       DO UPDATE SET 
         key_value = EXCLUDED.key_value,
         key_name = EXCLUDED.key_name,
         key_type = EXCLUDED.key_type,
         description = EXCLUDED.description,
         is_active = EXCLUDED.is_active,
         is_default = EXCLUDED.is_default,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, key_name, service_name, key_label, key_type, is_active, is_default`,
      [finalKeyName, encryptedValue, finalServiceName, finalKeyLabel, finalKeyType, finalDescription, isActive, isDefault, req.user.id]
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
    } else if (secret.service_name === 'ElevenLabs') {
      // Test ElevenLabs key
      const axios = (await import('axios')).default;
      try {
        const response = await axios.get('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': decryptedValue },
        });
        testResult = { success: true, message: 'ElevenLabs API key is valid', user: response.data };
      } catch (error) {
        testResult = { success: false, message: 'Invalid API key' };
      }
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
