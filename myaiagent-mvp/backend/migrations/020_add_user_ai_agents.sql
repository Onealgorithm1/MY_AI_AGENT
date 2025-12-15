-- Migration: Add User AI Agents Management
-- Description: Allow users to connect multiple AI providers (OpenAI, Anthropic, Google, etc.)
-- Date: 2025-12-15
-- NOTE: This migration safely handles both UUID and INTEGER user_id types

DO $$
DECLARE
  v_user_id_type TEXT;
BEGIN
  -- Detect the actual type of users.id column
  SELECT data_type INTO v_user_id_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';

  -- Create table with appropriate user_id type
  IF v_user_id_type = 'uuid' THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS user_ai_agents (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider_name VARCHAR(100) NOT NULL, -- openai, anthropic, google, grok, cohere, etc.
  agent_name VARCHAR(255) NOT NULL, -- User-friendly name (e.g., "My GPT-4o", "Claude 3 Opus")
  model VARCHAR(255) NOT NULL, -- Model identifier (gpt-4o, claude-3-opus, gemini-2.5-flash, etc.)
  api_key_id INTEGER REFERENCES api_secrets(id) ON DELETE SET NULL, -- Reference to encrypted API key
  oauth_token TEXT, -- For OAuth-based providers (encrypted)
  auth_type VARCHAR(50) NOT NULL DEFAULT 'api_key', -- api_key, oauth, service_account
  config JSONB DEFAULT '{}'::jsonb, -- Provider-specific config (temperature, max_tokens, etc.)
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'expired')),
  error_message TEXT, -- Store error details if status is 'error'
  last_tested_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider_name, agent_name)
);

CREATE INDEX idx_user_agents_user ON user_ai_agents(user_id);
CREATE INDEX idx_user_agents_default ON user_ai_agents(user_id, is_default);
CREATE INDEX idx_user_agents_active ON user_ai_agents(user_id, is_active);
CREATE INDEX idx_user_agents_provider ON user_ai_agents(user_id, provider_name);

COMMENT ON TABLE user_ai_agents IS 'User-connected AI agents with credentials and configuration';
COMMENT ON COLUMN user_ai_agents.provider_name IS 'AI provider (openai, anthropic, google, grok, cohere, etc.)';
COMMENT ON COLUMN user_ai_agents.api_key_id IS 'Foreign key to encrypted API key in api_secrets table';
COMMENT ON COLUMN user_ai_agents.oauth_token IS 'OAuth token (encrypted) for providers using OAuth flow';
COMMENT ON COLUMN user_ai_agents.config IS 'JSON config for model settings like temperature, max_tokens, etc.';
COMMENT ON COLUMN user_ai_agents.status IS 'Current status (active, inactive, error, expired)';
COMMENT ON COLUMN user_ai_agents.error_message IS 'Error details if status is error (e.g., invalid API key)';

-- ============================================
-- User Conversation AI Agent Mapping
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_ai_agents (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_agent_id INTEGER REFERENCES user_ai_agents(id) ON DELETE SET NULL,
  model_used VARCHAR(255), -- The actual model used in this conversation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_agents_conversation ON conversation_ai_agents(conversation_id);
CREATE INDEX idx_conversation_agents_user_agent ON conversation_ai_agents(user_agent_id);

COMMENT ON TABLE conversation_ai_agents IS 'Track which AI agent was used for each conversation';
COMMENT ON COLUMN conversation_ai_agents.user_agent_id IS 'Reference to user_ai_agents, NULL if agent was deleted';

-- ============================================
-- AI Agent Provider Configurations
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agent_providers (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  docs_url TEXT,
  base_url VARCHAR(500),
  auth_type VARCHAR(50) NOT NULL DEFAULT 'api_key', -- api_key, oauth, service_account
  oauth_auth_url VARCHAR(500),
  oauth_token_url VARCHAR(500),
  oauth_scopes TEXT[],
  supported_models JSONB DEFAULT '[]'::jsonb, -- Array of available models with metadata
  config_schema JSONB DEFAULT '{}'::jsonb, -- JSON schema for provider-specific config
  rate_limit_info JSONB DEFAULT '{}'::jsonb, -- RPM, TPM info
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_name ON ai_agent_providers(provider_name);
CREATE INDEX idx_provider_active ON ai_agent_providers(is_active);

COMMENT ON TABLE ai_agent_providers IS 'Configuration for supported AI providers';
COMMENT ON COLUMN ai_agent_providers.supported_models IS 'Array of model objects with id, name, capabilities, etc.';
COMMENT ON COLUMN ai_agent_providers.config_schema IS 'JSON schema describing configurable options for this provider';

-- ============================================
-- Insert Default AI Providers
-- ============================================
INSERT INTO ai_agent_providers (
  provider_name,
  display_name,
  logo_url,
  docs_url,
  base_url,
  auth_type,
  oauth_scopes,
  supported_models,
  config_schema
) VALUES
(
  'openai',
  'OpenAI',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/1200px-OpenAI_Logo.svg.png',
  'https://platform.openai.com/docs',
  'https://api.openai.com/v1',
  'api_key',
  ARRAY[]::TEXT[],
  '[
    {"id":"gpt-4o","name":"GPT-4o","capabilities":["vision","function_calling","streaming"],"max_tokens":128000},
    {"id":"gpt-4-turbo","name":"GPT-4 Turbo","capabilities":["vision","function_calling","streaming"],"max_tokens":128000},
    {"id":"gpt-4o-mini","name":"GPT-4o Mini","capabilities":["vision","function_calling","streaming"],"max_tokens":128000},
    {"id":"gpt-3.5-turbo","name":"GPT-3.5 Turbo","capabilities":["streaming"],"max_tokens":4096}
  ]'::jsonb,
  '{"temperature":{"type":"number","min":0,"max":2,"default":0.7},"max_tokens":{"type":"integer","min":1,"max":128000}}'::jsonb
) ON CONFLICT (provider_name) DO NOTHING;

INSERT INTO ai_agent_providers (
  provider_name,
  display_name,
  logo_url,
  docs_url,
  base_url,
  auth_type,
  supported_models,
  config_schema
) VALUES
(
  'anthropic',
  'Anthropic',
  'https://www.anthropic.com/_next/image?url=%2Fimages%2Flogo.svg&w=256&q=75',
  'https://docs.anthropic.com',
  'https://api.anthropic.com/v1',
  'api_key',
  '[
    {"id":"claude-3-opus-20250219","name":"Claude 3 Opus","capabilities":["vision","function_calling"],"max_tokens":200000},
    {"id":"claude-3-sonnet-20250229","name":"Claude 3 Sonnet","capabilities":["vision","function_calling"],"max_tokens":200000},
    {"id":"claude-3-haiku-20250307","name":"Claude 3 Haiku","capabilities":["vision"],"max_tokens":200000}
  ]'::jsonb,
  '{"temperature":{"type":"number","min":0,"max":1,"default":0.7},"max_tokens":{"type":"integer","min":1,"max":200000}}'::jsonb
) ON CONFLICT (provider_name) DO NOTHING;

INSERT INTO ai_agent_providers (
  provider_name,
  display_name,
  logo_url,
  docs_url,
  base_url,
  auth_type,
  supported_models,
  config_schema
) VALUES
(
  'google',
  'Google AI (Gemini)',
  'https://www.gstatic.com/images/branding/product/1x/gemini_2024_color_3x_web_32dp.png',
  'https://ai.google.dev/docs',
  'https://generativelanguage.googleapis.com/v1beta',
  'api_key',
  '[
    {"id":"gemini-2.5-flash","name":"Gemini 2.5 Flash","capabilities":["vision","function_calling","streaming"],"max_tokens":1000000},
    {"id":"gemini-2.5-pro","name":"Gemini 2.5 Pro","capabilities":["vision","function_calling","streaming"],"max_tokens":1000000},
    {"id":"gemini-1.5-flash","name":"Gemini 1.5 Flash","capabilities":["vision","function_calling"],"max_tokens":1000000},
    {"id":"gemini-1.5-pro","name":"Gemini 1.5 Pro","capabilities":["vision","function_calling"],"max_tokens":1000000}
  ]'::jsonb,
  '{"temperature":{"type":"number","min":0,"max":2,"default":0.7},"top_p":{"type":"number","min":0,"max":1,"default":0.95}}'::jsonb
) ON CONFLICT (provider_name) DO NOTHING;

INSERT INTO ai_agent_providers (
  provider_name,
  display_name,
  logo_url,
  docs_url,
  base_url,
  auth_type,
  supported_models,
  config_schema
) VALUES
(
  'cohere',
  'Cohere',
  'https://cohere.com/assets/cohere-mark.svg',
  'https://docs.cohere.com',
  'https://api.cohere.ai/v1',
  'api_key',
  '[
    {"id":"command-r-plus","name":"Command R Plus","capabilities":["function_calling","streaming"],"max_tokens":4096},
    {"id":"command-r","name":"Command R","capabilities":["streaming"],"max_tokens":4096},
    {"id":"command","name":"Command","capabilities":["streaming"],"max_tokens":4096}
  ]'::jsonb,
  '{"temperature":{"type":"number","min":0,"max":5,"default":0.8},"max_tokens":{"type":"integer","min":1,"max":4096}}'::jsonb
) ON CONFLICT (provider_name) DO NOTHING;

INSERT INTO ai_agent_providers (
  provider_name,
  display_name,
  logo_url,
  docs_url,
  base_url,
  auth_type,
  supported_models,
  config_schema
) VALUES
(
  'groq',
  'Groq',
  'https://www.groq.com/favicon.ico',
  'https://console.groq.com/docs',
  'https://api.groq.com/openai/v1',
  'api_key',
  '[
    {"id":"mixtral-8x7b-32768","name":"Mixtral 8x7B","capabilities":["streaming"],"max_tokens":32768},
    {"id":"llama-3.1-70b-versatile","name":"Llama 3.1 70B","capabilities":["streaming"],"max_tokens":8000},
    {"id":"gemma2-9b-it","name":"Gemma 2 9B","capabilities":["streaming"],"max_tokens":8192}
  ]'::jsonb,
  '{"temperature":{"type":"number","min":0,"max":2,"default":0.7}}'::jsonb
) ON CONFLICT (provider_name) DO NOTHING;

-- ============================================
-- Update Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_user_agents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_agents_timestamp
  BEFORE UPDATE ON user_ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_user_agents_timestamp();

CREATE TRIGGER update_ai_providers_timestamp
  BEFORE UPDATE ON ai_agent_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_user_agents_timestamp();

-- ============================================
-- Utility Functions
-- ============================================
CREATE OR REPLACE FUNCTION get_user_default_agent(p_user_id INTEGER)
RETURNS TABLE(id INTEGER, agent_name VARCHAR, provider_name VARCHAR, model VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT uaa.id, uaa.agent_name, uaa.provider_name, uaa.model
  FROM user_ai_agents uaa
  WHERE uaa.user_id = p_user_id
    AND uaa.is_default = TRUE
    AND uaa.is_active = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_default_agent(INTEGER) IS 'Get the default active AI agent for a user';

CREATE OR REPLACE FUNCTION deactivate_old_default_agents(p_user_id INTEGER, p_except_agent_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_ai_agents
  SET is_default = FALSE
  WHERE user_id = p_user_id
    AND is_default = TRUE
    AND id != p_except_agent_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deactivate_old_default_agents(INTEGER, INTEGER) IS 'Ensure only one default agent per user';
