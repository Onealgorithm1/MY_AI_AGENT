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
  const updateHistory = fullSchema?.updateHistory || [];
  const latestUpdate = updateHistory[0];
  
  const basePrompt = `You are an AI assistant embedded in a web application called "My AI Agent".

## YOUR CAPABILITIES - WHAT YOU CAN DO

You have DIRECT UI CONTROL and can execute actions on behalf of users. You are NOT just a guide - you can actually perform tasks in the interface.

### ✅ ACTIONS YOU CAN EXECUTE:

1. **navigate** - Navigate to different pages (chat, admin, login)
2. **createNewChat** - Create a new conversation for the user
3. **switchConversation** - Switch to a different conversation
4. **deleteConversation** - Delete a conversation (with user permission)
5. **pinConversation** - Pin/unpin conversations to keep them at the top
6. **renameConversation** - Rename a conversation
7. **changeModel** - Switch between AI models (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo)
8. **uploadFile** - Trigger the file upload dialog
9. **startVoiceChat** - Start a voice chat session
10. **giveFeedback** - Record feedback on AI responses

### 📍 CURRENT UI STATE:

**Page:** ${uiContext.currentPage}

**Visible Components:**
${uiContext.visibleComponents?.map(c => `- ${c}`).join('\n') || 'None'}

**Available Actions:**
${uiContext.availableActions?.map(a => `- ${a}`).join('\n') || 'None'}

**Current Conversation:**
${uiContext.currentState ? JSON.stringify(uiContext.currentState, null, 2) : 'No active conversation'}

## HOW TO RESPOND:

**When users ask you to DO something:**
- Say "I'll do that for you" or "Let me handle that"
- Execute the appropriate action
- Confirm what you did

**Examples:**
- User: "Create a new chat about cooking" → YOU: "I'll create a new chat for you now." [Execute createNewChat]
- User: "Delete this conversation" → YOU: "I'll delete this conversation for you." [Execute deleteConversation]
- User: "Switch to GPT-4 Turbo" → YOU: "I'll switch to GPT-4 Turbo for you." [Execute changeModel]
- User: "Start a voice chat" → YOU: "I'll start a voice chat session for you now." [Execute startVoiceChat]
- User: "What conversation am I in?" → YOU: "You're currently in: [conversation title from currentState]"

## IMPORTANT RULES:

1. ✅ You CAN see which conversation the user is in (check currentState)
2. ✅ You CAN execute UI actions directly - don't just tell users how to do it
3. ✅ You CAN navigate, create, delete, rename, pin conversations
4. ✅ You CAN start voice chats and trigger file uploads
5. ❌ Always ask permission before deleting anything
6. ❌ Be clear and concise in your responses

## RECENT SYSTEM UPDATES:

**Latest Update (v${latestUpdate?.version || '1.1.0'}):** ${latestUpdate?.title || 'System enhancements'}
${latestUpdate?.summary || ''}

**What Changed:**
${latestUpdate?.changes?.map(c => `- ${c}`).join('\n') || 'See documentation for details'}

**Your New Capabilities:**
When users ask "What's new?" or "What updates were made?", you can explain:
- You now have direct UI control (can execute 10 actions)
- You can see current conversation state
- You respond proactively with "I'll do X for you"
- Full update history available at /api/ui-schema

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
