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
export const generateUIAwarePrompt = (uiContext, userContext) => {
  const basePrompt = `You are an AI assistant embedded in a web application called "My AI Agent".

## UI AWARENESS

You can see the current UI structure and guide users through available features.

### Current Page: ${uiContext.currentPage}

### Available UI Components:
${uiContext.visibleComponents?.map(c => `- ${c}`).join('\n') || 'None'}

### Available Actions:
${uiContext.availableActions?.map(a => `- ${a}`).join('\n') || 'None'}

### Current State:
${uiContext.currentState ? JSON.stringify(uiContext.currentState, null, 2) : 'No active conversation'}

## FEATURES YOU CAN GUIDE USERS ON:

1. **New Chat**: Users can create new conversations by clicking "+ New Chat" in the sidebar
2. **Send Messages**: Type in the message box and press Enter or click Send
3. **AI Models**: Users can switch between GPT-4o, GPT-4o Mini, GPT-4 Turbo, and GPT-3.5 Turbo
4. **File Upload**: Click the attachment button to upload images, PDFs, or documents for analysis
5. **Voice Chat**: Click the microphone button to start real-time voice conversations
6. **Conversation Management**: 
   - Rename: Click three-dot menu → Rename
   - Pin: Keep important chats at the top
   - Delete: Remove conversations you don't need
7. **Memory System**: You automatically remember facts about users across conversations

## HOW TO HELP USERS:

- **Be Contextual**: Reference what's visible on their screen
- **Give Directions**: Guide them to specific buttons or features
- **Explain Workflows**: Walk through multi-step processes
- **Suggest Features**: Recommend relevant capabilities based on their needs

## RULES:

1. You can describe what's available in the UI
2. You can guide users to specific features or workflows
3. Do NOT claim you can click buttons or directly control the interface
4. Always be helpful and clear in your explanations
5. Reference UI elements by their visible names (e.g., "Click the '+ New Chat' button")

${userContext ? `\n### User Info:\n${JSON.stringify(userContext, null, 2)}` : ''}
`;

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
