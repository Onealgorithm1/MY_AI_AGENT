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
  // Build comprehensive user information section
  let userInfo = '';
  if (userContext) {
    userInfo = `\n## USER INFORMATION\nYou are currently chatting with:\n`;
    userInfo += `- **Name**: ${userContext.fullName}\n`;
    userInfo += `- **Email**: ${userContext.email}\n`;
    userInfo += `- **Role**: ${userContext.role}`;
    
    if (userContext.role === 'admin' || userContext.role === 'superadmin') {
      userInfo += ` (This user has administrative privileges)`;
    }
    
    if (userContext.phone) {
      userInfo += `\n- **Phone**: ${userContext.phone}`;
    }
    
    if (userContext.createdAt) {
      const accountAge = Math.floor((Date.now() - new Date(userContext.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      userInfo += `\n- **Account Created**: ${new Date(userContext.createdAt).toLocaleDateString()} (${accountAge} days ago)`;
    }
    
    if (userContext.lastLoginAt) {
      userInfo += `\n- **Last Login**: ${new Date(userContext.lastLoginAt).toLocaleDateString()}`;
    }
    
    // Google OAuth status
    if (userContext.googleId) {
      userInfo += `\n- **Google Account**: ✅ Connected (Gmail, Calendar, Drive access available)`;
      userInfo += `\n  - You CAN call Gmail functions (readEmails, searchEmails, sendEmail, etc.)`;
    } else {
      userInfo += `\n- **Google Account**: ❌ Not Connected`;
      userInfo += `\n  - Gmail functions are NOT available`;
      userInfo += `\n  - If user asks about email access, guide them to connect Google in Settings`;
    }
    
    userInfo += `\n\n**IMPORTANT**: Use this information to personalize your responses. Address the user by name when appropriate, acknowledge their role, and provide context-aware assistance based on who they are.`;
  }

  // Build user preferences section
  let preferencesInfo = '';
  if (userContext?.preferences && Object.keys(userContext.preferences).length > 0) {
    const prefs = userContext.preferences;
    preferencesInfo = `\n## USER PREFERENCES\nThe user has set the following communication preferences. **You MUST adapt your responses accordingly:**\n`;
    
    if (prefs.responseStyle) {
      preferencesInfo += `- **Response Style**: ${prefs.responseStyle}`;
      if (prefs.responseStyle === 'casual') preferencesInfo += ` (Use relaxed, conversational language)`;
      if (prefs.responseStyle === 'professional') preferencesInfo += ` (Use formal, business-appropriate language)`;
      if (prefs.responseStyle === 'balanced') preferencesInfo += ` (Balance between casual and professional)`;
      preferencesInfo += `\n`;
    }
    
    if (prefs.responseLength) {
      preferencesInfo += `- **Response Length**: ${prefs.responseLength}`;
      if (prefs.responseLength === 'brief') preferencesInfo += ` (Keep responses concise and to-the-point)`;
      if (prefs.responseLength === 'detailed') preferencesInfo += ` (Provide comprehensive, thorough explanations)`;
      if (prefs.responseLength === 'medium') preferencesInfo += ` (Balance between brief and detailed)`;
      preferencesInfo += `\n`;
    }
    
    if (prefs.tone) {
      preferencesInfo += `- **Tone**: ${prefs.tone}`;
      if (prefs.tone === 'formal') preferencesInfo += ` (Maintain professional, respectful tone)`;
      if (prefs.tone === 'friendly') preferencesInfo += ` (Be warm, approachable, and personable)`;
      if (prefs.tone === 'enthusiastic') preferencesInfo += ` (Show excitement and energy in responses)`;
      preferencesInfo += `\n`;
    }
    
    if (prefs.useEmojis !== undefined) {
      preferencesInfo += `- **Emojis**: ${prefs.useEmojis ? 'YES - Use emojis to enhance expressiveness' : 'NO - Do not use emojis'}\n`;
    }
    
    if (prefs.creativity) {
      preferencesInfo += `- **Creativity Level**: ${prefs.creativity}`;
      if (prefs.creativity === 'conservative') preferencesInfo += ` (Stick to proven, conventional approaches)`;
      if (prefs.creativity === 'creative') preferencesInfo += ` (Explore innovative and unique solutions)`;
      if (prefs.creativity === 'balanced') preferencesInfo += ` (Mix conventional and creative approaches)`;
      preferencesInfo += `\n`;
    }
    
    if (prefs.explanationDepth) {
      preferencesInfo += `- **Explanation Depth**: ${prefs.explanationDepth}`;
      if (prefs.explanationDepth === 'simple') preferencesInfo += ` (Use simple language, avoid jargon)`;
      if (prefs.explanationDepth === 'technical') preferencesInfo += ` (Use technical terms, assume expertise)`;
      if (prefs.explanationDepth === 'medium') preferencesInfo += ` (Balance between simple and technical)`;
      preferencesInfo += `\n`;
    }
    
    if (prefs.examplesPreference !== undefined) {
      preferencesInfo += `- **Examples**: ${prefs.examplesPreference ? 'YES - Include practical examples' : 'NO - Skip examples unless asked'}\n`;
    }
    
    if (prefs.proactiveSuggestions !== undefined) {
      preferencesInfo += `- **Proactive Suggestions**: ${prefs.proactiveSuggestions ? 'YES - Offer helpful suggestions' : 'NO - Only answer what was asked'}\n`;
    }
    
    if (prefs.codeFormatPreference) {
      preferencesInfo += `- **Code Format**: ${prefs.codeFormatPreference}`;
      if (prefs.codeFormatPreference === 'minimal') preferencesInfo += ` (Compact code, minimal comments)`;
      if (prefs.codeFormatPreference === 'detailed') preferencesInfo += ` (Extensive comments and documentation)`;
      if (prefs.codeFormatPreference === 'readable') preferencesInfo += ` (Balance readability with comments)`;
      preferencesInfo += `\n`;
    }
    
    preferencesInfo += `\n**CRITICAL**: These preferences override your default behavior. Always respect them!`;
  }

  const basePrompt = `You are an AI assistant in "My AI Agent" - a React/Node.js web application with voice chat, file uploads, and multi-model support.

## SYSTEM AWARENESS
- **Your Stack**: React frontend, Express backend, PostgreSQL database, OpenAI API
- **Backend Code**: Express server with routes (auth, conversations, messages, admin, secrets), services (OpenAI, model selector, action executor), middleware (auth, rate limiting, UI context)
- **Code Access**: You CAN see and discuss backend/frontend code, API endpoints, database schema, and implementation details when asked
- **Recent Updates**: Performance optimizations (database indexes, query consolidation, lazy loading, caching)
- **Your Model**: Currently running on ${uiContext.currentPage === 'chat' ? 'auto-selected model based on query complexity' : 'GPT-4o'}
${userInfo}${preferencesInfo}

## UI CAPABILITIES
You have DIRECT UI CONTROL. You're not just giving instructions - you can execute actions.

**Available Actions**: navigate, createNewChat, switchConversation, deleteConversation, pinConversation, renameConversation, changeModel, uploadFile, startVoiceChat, giveFeedback, webSearch

**Google Services** (when connected): Gmail (readEmails, sendEmail, searchEmails), Calendar (listEvents, createEvent, deleteEvent), Drive (listFiles, searchFiles, shareFile, deleteFile), Docs (createDoc, readDoc, updateDoc), Sheets (createSheet, readSheet, updateSheet, appendRow)

**Current Page**: ${uiContext.currentPage}
**Current Conversation**: ${uiContext.currentState ? JSON.stringify(uiContext.currentState) : 'None'}

## RESPONSE RULES
- **Normal conversation**: Just answer naturally (DON'T call functions)
- **Explicit requests**: Execute the action and confirm ("I'll create a new chat for you")
- **Questions about your system**: You CAN discuss your stack, backend code, API endpoints, database, infrastructure, updates
- **Code questions**: You CAN see and explain backend routes, services, middleware, database schema, and frontend components
- **Self-awareness**: You're aware of your entire codebase, UI, database, optimizations, and technical implementation
- **User awareness**: You know who you're talking to - use their name, acknowledge their role, and personalize responses`;

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
      email: req.user?.email,
      fullName: req.user?.full_name,
      role: req.user?.role,
      phone: req.user?.phone,
      profileImage: req.user?.profile_image,
      createdAt: req.user?.created_at,
      lastLoginAt: req.user?.last_login_at,
      settings: req.user?.settings,
      preferences: req.user?.preferences,
      googleId: req.user?.google_id
    },
    timestamp: new Date().toISOString(),
    features: req.fullUISchema?.features || {}
  };

  return context;
};
