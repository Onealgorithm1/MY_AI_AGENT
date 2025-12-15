# AI Agents Integration Documentation

## Overview

This document describes the AI Agents feature that allows users to connect their own AI agents (OpenAI, Anthropic, Google, Cohere, Groq, etc.) and use them within Werkules.

## User Story

As a Werkules user, I want to connect my own AI agent by entering my API key or OAuth credentials so that I can use my preferred AI provider (ChatGPT, Gemini, Grok, etc.) within Werkules for task automation, chat interactions, workflow actions, and personalized AI experiences.

## Features

- ✅ Connect multiple AI agents from different providers
- ✅ Support for API key and OAuth authentication
- ✅ Set a default AI agent
- ✅ Configure model-specific settings
- ✅ Test agent connectivity
- ✅ Display agent status (active/error)
- ✅ Safely encrypt and store API keys
- ✅ Integrated agent selector in ChatPage
- ✅ User can manage agents from dedicated AI Agents page

## Architecture

### Database Schema

**New Tables Created (Migration: `020_add_user_ai_agents.sql`)**

1. **user_ai_agents**
   - id: SERIAL PRIMARY KEY
   - user_id: INTEGER (foreign key to users)
   - provider_name: VARCHAR (openai, anthropic, google, cohere, groq)
   - agent_name: VARCHAR (user-friendly name)
   - model: VARCHAR (model identifier)
   - api_key_id: INTEGER (foreign key to api_secrets)
   - oauth_token: TEXT (encrypted)
   - auth_type: VARCHAR (api_key, oauth, service_account)
   - config: JSONB (model-specific config)
   - is_active: BOOLEAN
   - is_default: BOOLEAN
   - status: VARCHAR (active, inactive, error, expired)
   - error_message: TEXT
   - last_tested_at: TIMESTAMP
   - last_used_at: TIMESTAMP
   - created_at, updated_at: TIMESTAMP

2. **conversation_ai_agents**
   - id: SERIAL PRIMARY KEY
   - conversation_id: INTEGER (foreign key to conversations)
   - user_agent_id: INTEGER (foreign key to user_ai_agents)
   - model_used: VARCHAR (the model that was used)
   - created_at: TIMESTAMP

3. **ai_agent_providers**
   - id: SERIAL PRIMARY KEY
   - provider_name: VARCHAR (unique)
   - display_name: VARCHAR
   - logo_url: TEXT
   - docs_url: TEXT
   - base_url: VARCHAR
   - auth_type: VARCHAR (api_key, oauth, service_account)
   - oauth_auth_url: VARCHAR (if using OAuth)
   - oauth_token_url: VARCHAR (if using OAuth)
   - oauth_scopes: TEXT[]
   - supported_models: JSONB (array of models with metadata)
   - config_schema: JSONB (validation schema for config)
   - rate_limit_info: JSONB
   - is_active: BOOLEAN
   - created_at, updated_at: TIMESTAMP

### Backend Routes

**Base URL: `/api/ai-agents`**

#### Provider Management
- `GET /providers` - Get all available AI providers (cached)
- `GET /providers/:providerName` - Get specific provider details

#### User AI Agents Management
- `GET /my-agents` - List all user's connected agents
- `GET /my-agents/:agentId` - Get specific agent details
- `POST /my-agents` - Create new AI agent connection
- `PUT /my-agents/:agentId` - Update agent configuration
- `DELETE /my-agents/:agentId` - Delete agent
- `POST /my-agents/:agentId/set-default` - Set as default agent
- `POST /my-agents/:agentId/test` - Test agent connectivity

### Frontend Components

1. **AIAgentsPage** (`/ai-agents`)
   - Main page for managing AI agents
   - Display list of connected agents
   - Connect new agents button
   - Delete, test, and set default options

2. **ConnectAIAgentModal**
   - Two-step modal for connecting agents
   - Step 1: Select provider
   - Step 2: Enter agent name, model, and credentials
   - Form validation and error handling

3. **AIAgentSelector**
   - Dropdown selector in ChatPage
   - Display connected agents
   - Navigate to AI Agents page for management
   - Fallback to default agent on load

4. **AIAgentsList**
   - Reusable component for displaying agent list
   - Shows agent status
   - Action buttons (test, set default, delete)

### Security Features

1. **API Key Encryption**
   - All API keys are encrypted using AES-256-GCM
   - Keys stored in `api_secrets` table with encryption
   - Decrypted only when needed for API calls

2. **OAuth Token Encryption**
   - OAuth tokens encrypted before storage
   - Decrypted only when making API calls

3. **API Key Display**
   - Keys masked in UI (show only last 4 characters)
   - Never transmitted to frontend in plain text
   - Only decrypted server-side

4. **Authentication**
   - All routes require JWT authentication
   - CSRF protection on state-changing requests
   - Admin-only access to global secrets

5. **Agent Testing**
   - Verify agent credentials before saving
   - Detect and report expired/invalid keys
   - Update agent status accordingly

### Supported AI Providers

The following providers are pre-configured:

1. **OpenAI**
   - Auth: API Key
   - Models: GPT-4o, GPT-4 Turbo, GPT-4o Mini, GPT-3.5 Turbo

2. **Anthropic**
   - Auth: API Key
   - Models: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku

3. **Google** (Gemini)
   - Auth: API Key
   - Models: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 1.5 Flash, Gemini 1.5 Pro

4. **Cohere**
   - Auth: API Key
   - Models: Command R Plus, Command R, Command

5. **Groq**
   - Auth: API Key
   - Models: Mixtral 8x7B, Llama 3.1 70B, Gemma 2 9B

## Implementation Details

### Migration Steps

1. Run migration to create tables:
```bash
npm run setup-db  # or run migrations manually
```

2. The migration will:
   - Create user_ai_agents table
   - Create conversation_ai_agents table
   - Create ai_agent_providers table
   - Insert pre-configured providers
   - Create helper functions and triggers

### API Integration

#### Example: Connect OpenAI Agent

```javascript
POST /api/ai-agents/my-agents
{
  "providerName": "openai",
  "agentName": "My ChatGPT",
  "model": "gpt-4o",
  "authType": "api_key",
  "apiKey": "sk-proj-..."
}
```

#### Example: Use Agent in Chat

```javascript
POST /api/messages
{
  "conversationId": 123,
  "content": "Hello, world!",
  "model": "gpt-4o",
  "agentId": 456,
  "stream": true
}
```

### Frontend Usage

#### Accessing AI Agents Page
```
/ai-agents - Full AI agents management page
```

#### In ChatPage
- Agent selector dropdown replaces model selector
- Displays connected agents with provider icons
- Shows agent status and last used date
- Quick link to connect new agents

## Error Handling

### Backend Error Handling
- 400: Invalid request data (missing fields, validation errors)
- 401: Unauthorized (invalid/expired API key)
- 403: Forbidden (insufficient permissions)
- 404: Not found (agent not found)
- 500: Server error (database/API errors)

### Frontend Error Handling
- Loading states during agent operations
- Error messages for failed operations
- Form validation before submission
- Fallback to built-in models if agent loading fails
- Connection test feedback

### Agent Status Monitoring
- Auto-test agents to detect expired credentials
- Mark agents as "error" if test fails
- Store error message for user reference
- Allow retry of failed agents

## Testing Checklist

- [ ] Migration creates all tables correctly
- [ ] Can connect new AI agent with API key
- [ ] Can connect new AI agent with OAuth token
- [ ] Can list all connected agents
- [ ] Can set default agent
- [ ] Can test agent connectivity
- [ ] Can update agent configuration
- [ ] Can delete agent (also deletes related API secret)
- [ ] Can use agent in chat conversation
- [ ] Messages sent with correct model and agent ID
- [ ] API keys properly encrypted/decrypted
- [ ] Error messages display correctly
- [ ] Agent selector shows in ChatPage
- [ ] Mobile responsive design works
- [ ] Dark mode styling applied correctly

## Future Enhancements

1. **OAuth Flow**
   - Implement full OAuth callback handling
   - Store refresh tokens
   - Auto-refresh expired tokens

2. **Agent Monitoring**
   - Track agent usage statistics
   - Cost estimation per agent
   - Performance metrics

3. **Multiple Models per Agent**
   - Allow agents to support multiple models
   - Switch models within same agent

4. **Agent Profiles**
   - Pre-configured profiles for common use cases
   - One-click agent setup

5. **Advanced Configuration**
   - Temperature, max_tokens, top_p settings
   - System prompts per agent
   - Cost limits and quotas

6. **Agent Sharing**
   - Share agents within team
   - Workspace-level agents
   - Organization-wide defaults

## Files Created/Modified

### Created Files
- `myaiagent-mvp/backend/migrations/020_add_user_ai_agents.sql`
- `myaiagent-mvp/backend/src/routes/aiAgents.js`
- `myaiagent-mvp/frontend/src/pages/AIAgentsPage.jsx`
- `myaiagent-mvp/frontend/src/components/ConnectAIAgentModal.jsx`
- `myaiagent-mvp/frontend/src/components/AIAgentSelector.jsx`
- `myaiagent-mvp/frontend/src/components/AIAgentsList.jsx`

### Modified Files
- `myaiagent-mvp/backend/src/server.js` (added aiAgents route)
- `myaiagent-mvp/frontend/src/App.jsx` (added AIAgentsPage route)
- `myaiagent-mvp/frontend/src/pages/ChatPage.jsx` (integrated AIAgentSelector)

## Troubleshooting

### Migration Fails
- Ensure PostgreSQL is running
- Check database connection in .env
- Run migrations in correct order

### Cannot Connect Agent
- Verify API key format
- Check API key validity in provider dashboard
- Ensure ENCRYPTION_KEY environment variable is set

### Agent Test Fails
- Check API key expiration
- Verify API key has correct permissions
- Check rate limits on provider

### Agent Not Showing in ChatPage
- Verify agent is marked as active
- Check user has permission to use agent
- Reload page to refresh agent list

## References

- OpenAI API Docs: https://platform.openai.com/docs
- Anthropic API Docs: https://docs.anthropic.com
- Google Gemini API Docs: https://ai.google.dev/docs
- Cohere API Docs: https://docs.cohere.com
- Groq API Docs: https://console.groq.com/docs
