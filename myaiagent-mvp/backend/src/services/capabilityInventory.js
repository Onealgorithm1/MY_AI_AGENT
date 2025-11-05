/**
 * Capability Inventory Service
 * Complete catalog of all AI capabilities with examples
 * This makes the AI aware of EVERYTHING it can do, regardless of context
 */

/**
 * Complete function catalog with detailed descriptions and examples
 * This is ALWAYS shown to the AI, even if functions aren't executable in current context
 */
export function getCompleteCapabilityCatalog(userHasGoogleAccess = false) {
  const catalog = {
    uiActions: [
      {
        name: 'navigate',
        category: 'Navigation',
        description: 'Navigate to different pages in the application',
        available: 'Always',
        parameters: ['page: chat | admin | login'],
        examples: [
          'User: "Take me to the admin panel" → Call navigate({page: "admin"})',
          'User: "Go to settings" → Explain settings are in profile page',
          'User: "Show me the login page" → Call navigate({page: "login"})'
        ],
        when_to_use: 'When user explicitly asks to go to a different page'
      },
      {
        name: 'createNewChat',
        category: 'Conversation Management',
        description: 'Create a new conversation',
        available: 'Always',
        parameters: ['title?: string (optional)'],
        examples: [
          'User: "Start a new chat" → Call createNewChat()',
          'User: "Create a conversation about Python" → Call createNewChat({title: "Python Discussion"})',
          'User: "Fresh start" → Call createNewChat()'
        ],
        when_to_use: 'When user wants to start a new conversation'
      },
      {
        name: 'renameConversation',
        category: 'Conversation Management',
        description: 'Rename the current conversation',
        available: 'Always',
        parameters: ['title: string'],
        examples: [
          'User: "Rename this chat to Project Ideas" → Call renameConversation({title: "Project Ideas"})',
          'User: "Call this conversation Budget Planning" → Call renameConversation({title: "Budget Planning"})'
        ],
        when_to_use: 'When user wants to rename current conversation'
      },
      {
        name: 'deleteConversation',
        category: 'Conversation Management',
        description: 'Delete the current conversation',
        available: 'Always',
        parameters: ['confirm: true'],
        examples: [
          'User: "Delete this chat" → Call deleteConversation({confirm: true})',
          'User: "Remove this conversation" → Call deleteConversation({confirm: true})'
        ],
        when_to_use: 'When user wants to delete current conversation'
      },
      {
        name: 'changeModel',
        category: 'AI Configuration',
        description: 'Switch AI model',
        available: 'Always',
        parameters: ['model: gemini-2.5-flash | gemini-2.5-pro | auto'],
        examples: [
          'User: "Switch to Pro model" → Call changeModel({model: "gemini-2.5-pro"})',
          'User: "Use auto mode" → Call changeModel({model: "auto"})',
          'User: "Change to faster model" → Call changeModel({model: "gemini-2.5-flash"})'
        ],
        when_to_use: 'When user explicitly requests model change'
      }
    ],
    searchCapabilities: [
      {
        name: 'webSearch',
        category: 'Web Search',
        description: 'Search the web for current information using Google Custom Search API',
        available: 'Always',
        parameters: ['query: string', 'numResults?: number (default: 5, max: 10)'],
        examples: [
          'User: "Search for latest AI news" → Call webSearch({query: "latest AI news 2024"})',
          'User: "Look up weather in Paris" → Call webSearch({query: "weather Paris today"})',
          'User: "Find information about quantum computing" → Call webSearch({query: "quantum computing"})'
        ],
        when_to_use: 'When user asks to search, look up, find information, or asks about current events/news/prices/weather/scores',
        auto_trigger_keywords: ['search', 'look up', 'find', 'latest', 'current', 'today', 'news', 'weather', 'price', 'score']
      },
      {
        name: 'Vertex AI Grounding',
        category: 'Web Search',
        description: 'Automatic Google Search grounding via Vertex AI (happens automatically, not a function you call)',
        available: 'Automatic when using Vertex AI models',
        parameters: 'N/A - automatic',
        examples: [
          'User: "Who won the Super Bowl?" → Vertex AI automatically searches and grounds response',
          'User: "Latest stock price of Apple" → Vertex AI automatically fetches real-time data',
          'User: "Current news about AI" → Vertex AI automatically searches news'
        ],
        when_to_use: 'Automatically triggered by backend for real-time queries',
        note: 'You don\'t call this - the backend automatically uses Vertex AI with grounding for real-time queries'
      }
    ],
    googleServices: userHasGoogleAccess ? [
      {
        name: 'readEmails',
        category: 'Gmail',
        description: 'Read emails from user\'s Gmail inbox',
        available: '✅ User has Google connected',
        parameters: ['maxResults?: number (default: 10, max: 50)', 'query?: string (Gmail search syntax)'],
        examples: [
          'User: "Check my emails" → Call readEmails({maxResults: 10})',
          'User: "Show unread emails" → Call readEmails({query: "is:unread", maxResults: 20})',
          'User: "Emails from john@example.com" → Call readEmails({query: "from:john@example.com"})'
        ],
        when_to_use: 'When user asks to check, read, or show emails',
        note: 'Use Gmail search syntax for queries: is:unread, from:email, subject:text, has:attachment, newer_than:7d'
      },
      {
        name: 'searchEmails',
        category: 'Gmail',
        description: 'Search for specific emails in Gmail',
        available: '✅ User has Google connected',
        parameters: ['query: string (Gmail search syntax)', 'maxResults?: number'],
        examples: [
          'User: "Find emails about the project" → Call searchEmails({query: "project"})',
          'User: "Search for emails with attachments from last week" → Call searchEmails({query: "has:attachment newer_than:7d"})',
          'User: "Find important emails" → Call searchEmails({query: "is:important"})'
        ],
        when_to_use: 'When user asks to search or find specific emails'
      },
      {
        name: 'sendEmail',
        category: 'Gmail',
        description: 'Send an email via Gmail',
        available: '✅ User has Google connected',
        parameters: ['to: string (email address)', 'subject: string', 'body: string'],
        examples: [
          'User: "Send email to john@example.com saying hi" → Call sendEmail({to: "john@example.com", subject: "Hi", body: "Hi John!"})',
          'User: "Email the team about tomorrow\'s meeting" → Call sendEmail({to: "team@company.com", subject: "Tomorrow\'s Meeting", body: "..."})'
        ],
        when_to_use: 'When user asks to send, compose, or draft an email'
      },
      {
        name: 'listEvents',
        category: 'Google Calendar',
        description: 'List calendar events',
        available: '⚠️  Backend service exists but function not enabled',
        parameters: ['maxResults?: number', 'timeMin?: string', 'timeMax?: string'],
        examples: [
          'User: "What\'s on my calendar?" → Would call listEvents() if enabled',
          'User: "Show this week\'s events" → Would call listEvents({timeMin: "today", timeMax: "7d"}) if enabled'
        ],
        when_to_use: 'Calendar functions exist in backend but not exposed to you yet',
        limitation: 'Backend has googleCalendar.js service but functions not in UI_FUNCTIONS array',
        how_to_enable: 'Add calendar functions to uiFunctions.js exports'
      },
      {
        name: 'listFiles',
        category: 'Google Drive',
        description: 'List files in Google Drive',
        available: '⚠️  Backend service exists but function not enabled',
        parameters: ['maxResults?: number', 'query?: string'],
        examples: [
          'User: "Show my Drive files" → Would call listFiles() if enabled',
          'User: "Find PDFs in my Drive" → Would call listFiles({query: "mimeType=\'application/pdf\'"}) if enabled'
        ],
        when_to_use: 'Drive functions exist in backend but not exposed to you yet',
        limitation: 'Backend has googleDrive.js service but functions not in UI_FUNCTIONS array',
        how_to_enable: 'Add drive functions to uiFunctions.js exports'
      },
      {
        name: 'createDoc / readDoc / updateDoc',
        category: 'Google Docs',
        description: 'Manage Google Docs',
        available: '⚠️  Backend service exists but function not enabled',
        parameters: 'Various parameters for creating, reading, updating docs',
        when_to_use: 'Docs functions exist in backend but not exposed to you yet',
        limitation: 'Backend has googleDocs.js service but functions not in UI_FUNCTIONS array',
        how_to_enable: 'Add docs functions to uiFunctions.js exports'
      },
      {
        name: 'createSheet / readSheet / updateSheet / appendRow',
        category: 'Google Sheets',
        description: 'Manage Google Sheets',
        available: '⚠️  Backend service exists but function not enabled',
        parameters: 'Various parameters for managing spreadsheets',
        when_to_use: 'Sheets functions exist in backend but not exposed to you yet',
        limitation: 'Backend has googleSheets.js service but functions not in UI_FUNCTIONS array',
        how_to_enable: 'Add sheets functions to uiFunctions.js exports'
      }
    ] : [
      {
        name: 'Gmail / Calendar / Drive / Docs / Sheets',
        category: 'Google Services',
        description: 'Full Google Workspace integration',
        available: '❌ User has NOT connected Google account',
        when_to_use: 'User must connect Google account in Settings first',
        how_to_enable: 'Guide user to Settings page to connect Google OAuth',
        note: 'Backend services are ready (gmail.js, googleCalendar.js, etc.) but user needs to authorize'
      }
    ],
    voiceCapabilities: [
      {
        name: 'Text-to-Speech',
        category: 'Voice',
        description: 'Convert text to speech using Google Cloud TTS (1,886 voices available)',
        available: 'Via frontend UI',
        when_to_use: 'User can click TTS button on messages - not a function you call',
        note: 'This happens in the frontend, not via function calling'
      },
      {
        name: 'Speech-to-Text',
        category: 'Voice',
        description: 'Convert speech to text using Google Cloud STT',
        available: 'Via frontend UI',
        when_to_use: 'User can use voice input button - not a function you call',
        note: 'This happens in the frontend, not via function calling'
      },
      {
        name: 'Real-time Voice Chat',
        category: 'Voice',
        description: 'Live voice conversation',
        available: 'Via frontend UI',
        when_to_use: 'User can start voice chat from UI - not a function you call',
        note: 'This happens in the frontend with WebSockets, not via function calling'
      }
    ],
    visionCapabilities: [
      {
        name: 'Image Analysis',
        category: 'Vision',
        description: 'Analyze images uploaded by user using Gemini vision',
        available: 'Automatic when user uploads images',
        when_to_use: 'Automatically triggered when user uploads files',
        note: 'This happens automatically via /api/attachments/upload, not a function you call'
      }
    ]
  };

  return catalog;
}

/**
 * Generate capability inventory prompt section
 * This shows the AI ALL its capabilities with examples
 */
export function generateCapabilityInventoryPrompt(userHasGoogleAccess = false) {
  const catalog = getCompleteCapabilityCatalog(userHasGoogleAccess);
  
  let prompt = `\n## 📋 COMPLETE CAPABILITY INVENTORY

This is EVERYTHING you can do. Study this carefully - it defines your powers.

**CRITICAL UNDERSTANDING:**
- ✅ Functions marked "Always" = You can call these anytime
- ✅ Functions marked "User has Google connected" = You can call these for this user
- ⚠️  Functions marked "Backend exists but not enabled" = Code exists but not accessible to you yet
- ❌ Functions marked "User NOT connected" = User must connect Google account first
- 📝 "Via frontend UI" = User does this in the interface, you just reference it

---

### UI ACTIONS (Always Available)
`;

  catalog.uiActions.forEach(func => {
    prompt += `
**${func.name}** - ${func.description}
- Status: ${func.available}
- Parameters: ${func.parameters.join(', ')}
- When to use: ${func.when_to_use}
- Examples:
${func.examples.map(ex => `  ${ex}`).join('\n')}
`;
  });

  prompt += `\n### WEB SEARCH CAPABILITIES
`;

  catalog.searchCapabilities.forEach(func => {
    prompt += `
**${func.name}** - ${func.description}
- Status: ${func.available}
`;
    if (func.parameters !== 'N/A - automatic') {
      prompt += `- Parameters: ${func.parameters.join(', ')}\n`;
    }
    prompt += `- When to use: ${func.when_to_use}
- Examples:
${func.examples.map(ex => `  ${ex}`).join('\n')}
`;
    if (func.note) {
      prompt += `- **Note**: ${func.note}\n`;
    }
    if (func.auto_trigger_keywords) {
      prompt += `- **Auto-triggers on keywords**: ${func.auto_trigger_keywords.join(', ')}\n`;
    }
  });

  prompt += `\n### GOOGLE SERVICES
`;

  catalog.googleServices.forEach(func => {
    prompt += `
**${func.name}** - ${func.description}
- Status: ${func.available}
`;
    if (func.parameters) {
      prompt += `- Parameters: ${Array.isArray(func.parameters) ? func.parameters.join(', ') : func.parameters}\n`;
    }
    if (func.when_to_use) {
      prompt += `- When to use: ${func.when_to_use}\n`;
    }
    if (func.examples) {
      prompt += `- Examples:\n${func.examples.map(ex => `  ${ex}`).join('\n')}\n`;
    }
    if (func.limitation) {
      prompt += `- **Limitation**: ${func.limitation}\n`;
    }
    if (func.how_to_enable) {
      prompt += `- **How to enable**: ${func.how_to_enable}\n`;
    }
    if (func.note) {
      prompt += `- **Note**: ${func.note}\n`;
    }
  });

  prompt += `\n### VOICE & VISION
`;

  [...catalog.voiceCapabilities, ...catalog.visionCapabilities].forEach(func => {
    prompt += `
**${func.name}** - ${func.description}
- Status: ${func.available}
- When to use: ${func.when_to_use}
- Note: ${func.note}
`;
  });

  prompt += `
---

## 🎯 HOW TO USE THIS CAPABILITY INVENTORY

### When user asks for something:
1. **Check this inventory** to see if you have that capability
2. **Check the status** (Always, User connected, Backend exists but not enabled, etc.)
3. **Follow the examples** for how to call the function
4. **If not available**, explain specifically why and what's needed

### When you CAN do something:
- Call the function confidently
- Confirm the action to the user
- Example: "I'll check your emails now" → Call readEmails()

### When you CANNOT do something:
- **Be specific about why**: Reference this inventory
- **Explain what's needed**: Quote the "How to enable" section
- **Suggest alternatives**: Offer what you CAN do instead

**Example of good limitation explanation**:
User: "Add an event to my calendar"
You: "I can see you have Google connected (✅), and I have the googleCalendar.js backend service, but calendar functions are not currently exposed to me in the function calling interface. The backend capability exists at /backend/src/services/googleCalendar.js with functions like createEvent, listEvents, and deleteEvent, but these haven't been added to the UI_FUNCTIONS array in uiFunctions.js yet. To enable this, the calendar functions would need to be added to the executable function list. In the meantime, I can help you check your emails or search the web for calendar management tips!"

This shows:
✅ You know exactly what you have and don't have
✅ You explain the technical gap specifically  
✅ You provide clear path to enabling it
✅ You offer helpful alternatives

Always be this precise about your capabilities and limitations!`;

  return prompt;
}

export default {
  getCompleteCapabilityCatalog,
  generateCapabilityInventoryPrompt
};
