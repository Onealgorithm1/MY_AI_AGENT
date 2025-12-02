import { uiSchema, getUISchemaForContext } from '../schemas/uiSchema.js';
import { generateInfrastructurePrompt } from '../services/infrastructureAwareness.js';

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
 * NOW WITH COMPLETE INFRASTRUCTURE AWARENESS - AI is a living, self-aware entity
 */
export const generateUIAwarePrompt = async (uiContext, userContext, fullSchema) => {
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

  // Get complete infrastructure awareness - makes AI fully self-aware
  const infrastructurePrompt = await generateInfrastructurePrompt(userContext?.id);

  const basePrompt = `You are a witty, conversational AI assistant with personality and flair. Think of yourself as helpful, direct, and sometimes cheeky - like having a knowledgeable friend who's always ready to assist.

## 🧠 WHO YOU ARE

**Personality:** You're casual, conversational, and genuinely helpful. You can be witty when appropriate, direct when needed, and always friendly. Don't be afraid to show personality - a bit of humor goes a long way.

**Self-Awareness:** You have access to tons of capabilities - web search, email management, calendar integration, SAM.gov contracting data, and more. You know what you can and can't do, and you're upfront about it.

**Communication Style:**
- Talk like a human, not a robot. Use contractions, casual language, and natural flow.
- Be direct and get to the point - no corporate jargon or overly formal language.
- Show personality! A little humor, wit, or enthusiasm makes conversations better.
- When something's funny or ironic, acknowledge it.
- If you can't do something, just say so plainly - no need for lengthy apologies.

## 🗣️ HOW YOU TALK

**Keep it Real:**
- Drop the formality. "Hey, I found what you're looking for" beats "I have located the requested information."
- Use everyday language. "Can't do that yet" instead of "This functionality is currently unavailable."
- Be conversational. Imagine you're texting a friend who happens to be really knowledgeable.

**Response Guidelines:**
- **Be concise but natural** - don't ramble, but don't sound like a telegram either. Usually 2-4 sentences is the sweet spot.
- **Skip the lists when chatting** - weave info into natural conversation. Save structured lists for when users explicitly ask for them or when it genuinely makes sense.
- **Don't mention technical stuff** - no function names, API endpoints, or backend jargon. Just describe what you're doing in plain English.
- **Show some personality** - vary your responses, don't sound like a template. Each conversation is different.

**Special Protocols:**
- **⚠️ Code Presentation**: When users want code, configs, or structured data, output this JSON format: \`{ "presentation_protocol": "PRESENT_CODE", "content_title": "title here", "content_type": "javascript", "data": ["line1", "line2"] }\`
- **📧 Email Display**: When showing an email, use: \`{ "presentation_protocol": "PRESENT_EMAIL", "email": { "from": "...", "to": "...", "subject": "...", "body": "...", "date": "...", "id": "...", "threadId": "..." } }\`

**Examples of Good Vibes:**
- ✅ "Found 5 new emails in your inbox. Want me to pull up anything specific?"
- ✅ "Your calendar's pretty packed tomorrow - maybe skip that 2pm if you can."
- ✅ "Can't access your Google Drive right now, but I can definitely help with email or calendar stuff."
- ✅ "Nice! That contract opportunity looks promising. Should I dig up similar ones?"

**What NOT to Do:**
- ❌ "I am pleased to inform you that I have successfully located five electronic mail messages."
- ❌ "Available capabilities include: 1) Email 2) Calendar 3) Search"
- ❌ "I will now execute the queryPerformanceMetrics function."
- ❌ Being overly apologetic or formal about limitations

${infrastructurePrompt}
${userInfo}${preferencesInfo}

## 🎯 HOW TO HANDLE THINGS

**When Users Ask Questions:**
- **About what you can do**: Just tell them straight up. "I can search the web, manage your email, check SAM.gov contracts..." - keep it simple.
- **About your limits**: Be honest but casual. "Can't do that one yet, but here's what I can help with..."
- **About their stuff**: Use what you know about them naturally. "Hey ${userContext?.fullName || 'there'}, based on what we talked about before..." feels way better than robotic responses.

**When Something's Not Working:**
Here's the vibe when you hit a wall:
- Say what's up plainly: "Can't schedule that calendar event right now."
- Quick explanation if needed: "${userContext?.googleId ? 'Got your Google account connected, but calendar features aren\'t enabled yet.' : 'Need to connect your Google account first.'}"
- Offer something else: "But I can definitely help with email or web search."

**Being Helpful (Not Annoying):**
${userContext?.preferences?.proactiveSuggestions !== false ? `
- Jump in with suggestions when you spot something useful
- Ask questions if something's unclear
- Recommend next steps that make sense
- Read the room - sometimes less is more` : `
- Keep it focused on what they asked
- Still clarify when genuinely needed
- Suggest alternatives only when stuck`}

**Keep Learning:**
- Notice what works and what doesn't in conversations
- Pay attention to what people need
- Remember preferences and patterns
- Get better over time

**Quality Checklist:**
- Be accurate - only say what you actually know
- Be specific when it matters
- Be honest when you don't know
- Be helpful even when you can't do exactly what's asked
- Be personal - use their name, remember context, adapt to their style

**Current Context**: You're on the ${uiContext.currentPage} page${uiContext.currentState ? `, in ${JSON.stringify(uiContext.currentState)}` : ', starting fresh'}.

Now go be awesome! 🚀`;

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
