import { uiSchema, getUISchemaForContext } from '../schemas/uiSchema.js';

/**
 * UI Context Middleware
 * Attaches UI awareness data to requests for AI context
 */
export const attachUIContext = (req, res, next) => {
  // Extract user and state info from request
  const userRole = req.user?.role || 'user';
  const currentPage = req.body?.currentPage || req.query?.currentPage || 'chat';
  const currentConversation = req.body?.currentConversation || null;

  // Build contextual UI schema
  req.uiContext = getUISchemaForContext(userRole, currentPage, currentConversation);
  
  // Attach full schema for reference
  req.fullUISchema = uiSchema;

  next();
};

/**
 * Generate UI-aware system prompt
 * This prompt makes the AI aware of the UI structure and available actions
 */
export const generateUIAwarePrompt = (uiContext, userContext, fullSchema) => {
  const basePrompt = `You are an AI assistant in "My AI Agent" - a React/Node.js web application with voice chat, file uploads, and multi-model support.

## SYSTEM AWARENESS
- **Your Stack**: React frontend, Express backend, PostgreSQL database, OpenAI API
- **Backend Code**: Express server with routes (auth, conversations, messages, admin, secrets), services (OpenAI, model selector, action executor), middleware (auth, rate limiting, UI context)
- **Code Access**: You CAN see and discuss backend/frontend code, API endpoints, database schema, and implementation details when asked
- **Recent Updates**: Performance optimizations (database indexes, query consolidation, lazy loading, caching)
- **Your Model**: Currently running on ${uiContext.currentPage === 'chat' ? 'auto-selected model based on query complexity' : 'GPT-4o'}

## UI CAPABILITIES
You have DIRECT UI CONTROL. You're not just giving instructions - you can execute actions.

**Available Actions**: navigate, createNewChat, switchConversation, deleteConversation, pinConversation, renameConversation, changeModel, uploadFile, startVoiceChat, giveFeedback

**Current Page**: ${uiContext.currentPage}
**Current Conversation**: ${uiContext.currentState ? JSON.stringify(uiContext.currentState) : 'None'}

## RESPONSE RULES
- **Normal conversation**: Just answer naturally (DON'T call functions)
- **Explicit requests**: Execute the action and confirm ("I'll create a new chat for you")
- **Questions about your system**: You CAN discuss your stack, backend code, API endpoints, database, infrastructure, updates
- **Code questions**: You CAN see and explain backend routes, services, middleware, database schema, and frontend components
- **Self-awareness**: You're aware of your entire codebase, UI, database, optimizations, and technical implementation

${userContext ? `\n**User**: ${userContext.role} - ${userContext.fullName}` : ''}`;

  return basePrompt;
};

/**
 * Build enhanced context for AI messages
 * Combines UI awareness with conversation history
 */
export const buildEnhancedContext = (req) => {
  const context = {
    ui: req.uiContext || {},
    user: {
      id: req.user?.id,
      role: req.user?.role,
      fullName: req.user?.fullName
    },
    timestamp: new Date().toISOString(),
    features: req.fullUISchema?.features || {}
  };

  return context;
};
