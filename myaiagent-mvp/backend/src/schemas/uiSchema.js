export const uiSchema = {
  application: {
    name: "My AI Agent",
    version: "1.1.0",
    description: "AI chat application with voice, memory, and multi-model support"
  },
  
  updateHistory: [
    {
      version: '1.2.0',
      date: '2025-11-01',
      title: 'Comprehensive Performance Optimizations',
      summary: 'Global performance optimization across database, backend, and frontend',
      changes: [
        'Database: Added 10+ performance indexes for frequently queried columns',
        'Backend: Consolidated admin stats from 8+ queries to 1 efficient CTE query',
        'Backend: Optimized connection pool (25 max, 5 min connections, slow query detection)',
        'Backend: Image analysis now runs asynchronously to prevent blocking uploads',
        'Backend: Added HTTP caching for static endpoints (5-10 min cache)',
        'Frontend: Implemented lazy loading for ChatPage and AdminPage (code splitting)',
        'Frontend: Optimized React Query (2min staleTime, 10min cacheTime, refetch on mount)',
        'Frontend: Created performance utilities (debounce, throttle, memoization)'
      ],
      improvements: [
        'Faster admin dashboard load times (8x fewer database queries)',
        'Improved upload responsiveness (async image analysis)',
        'Reduced initial page load size (code splitting)',
        'Better data freshness with balanced caching strategy',
        'Proactive slow query detection (>1000ms)'
      ],
      impact: 'Significantly faster application performance across all layers'
    },
    {
      version: '1.1.0',
      date: '2025-10-31',
      title: 'Enhanced System Prompt for Direct Action Execution',
      summary: 'AI now understands it has direct UI control capabilities',
      changes: [
        'Updated system prompt to state "you have DIRECT UI CONTROL"',
        'AI can now see current conversation state',
        'AI responds with "I\'ll do X for you" instead of just giving instructions',
        'Fixed Tests 8 & 9 - AI acknowledges ability to see and delete conversations',
        'Added 10 executable actions to system prompt with examples'
      ],
      filesModified: [
        'backend/src/middleware/uiContext.js',
        'UI_AGENT_TEST_SCRIPT.txt'
      ],
      impact: 'AI behavior changed from passive guide to active assistant'
    },
    {
      version: '1.0.0',
      date: '2025-10-31',
      title: 'UI-Aware AI Agent System',
      summary: 'Complete system for AI to understand and control the UI',
      changes: [
        'Created UI Schema Layer with metadata for all components',
        'Built Context Engine middleware for UI context injection',
        'Implemented Action Execution Layer with 10 executable actions',
        'Added Event Tracking System for user interaction logging',
        'Frontend integration with React hooks (useUIActions, useEventTracking)',
        'Created 2 new database tables (ui_actions, user_events)',
        'Added 11 new API endpoints for UI schema, actions, and events'
      ],
      filesCreated: [
        'backend/src/schemas/uiSchema.js',
        'backend/src/middleware/uiContext.js',
        'backend/src/services/actionExecutor.js',
        'backend/src/services/eventTracker.js',
        'backend/src/routes/ui-schema.js',
        'backend/src/routes/ui-actions.js',
        'backend/src/routes/events.js',
        'frontend/src/hooks/useUIActions.js',
        'frontend/src/hooks/useEventTracking.js',
        'frontend/src/services/uiActions.js',
        'frontend/src/services/events.js'
      ],
      executableActions: [
        'navigate',
        'createNewChat',
        'switchConversation',
        'deleteConversation',
        'pinConversation',
        'renameConversation',
        'changeModel',
        'uploadFile',
        'startVoiceChat',
        'giveFeedback'
      ],
      impact: 'AI can now understand UI structure and execute actions directly'
    }
  ],

  pages: {
    chat: {
      id: "chat",
      path: "/",
      name: "Chat Interface",
      description: "Main chat interface with conversation management",
      components: [
        {
          id: "sidebar",
          type: "container",
          label: "Conversation Sidebar",
          description: "List of user conversations with management controls",
          children: [
            {
              id: "newChatButton",
              type: "button",
              label: "+ New Chat",
              action: "createConversation",
              description: "Creates a new conversation"
            },
            {
              id: "conversationList",
              type: "list",
              label: "Conversations",
              description: "Scrollable list of user conversations",
              itemActions: [
                {
                  id: "selectConversation",
                  type: "click",
                  label: "Open conversation",
                  description: "Loads and displays the conversation messages"
                },
                {
                  id: "renameConversation",
                  type: "menu_action",
                  label: "Rename",
                  description: "Opens inline editor to rename conversation"
                },
                {
                  id: "pinConversation",
                  type: "menu_action",
                  label: "Pin/Unpin",
                  description: "Toggles conversation pin status (pinned chats appear at top)"
                },
                {
                  id: "deleteConversation",
                  type: "menu_action",
                  label: "Delete",
                  description: "Deletes conversation after confirmation"
                }
              ]
            },
            {
              id: "userMenu",
              type: "menu",
              label: "User Profile",
              description: "Shows user info and admin access if applicable",
              actions: [
                {
                  id: "adminPanel",
                  type: "button",
                  label: "Admin Panel",
                  visible: "user.role === 'admin' || user.role === 'superadmin'",
                  description: "Opens admin dashboard"
                },
                {
                  id: "logout",
                  type: "button",
                  label: "Logout",
                  description: "Logs out the current user"
                }
              ]
            }
          ]
        },
        {
          id: "chatArea",
          type: "container",
          label: "Chat Messages Area",
          description: "Main conversation display and input area",
          children: [
            {
              id: "messageList",
              type: "list",
              label: "Messages",
              description: "Displays conversation messages with user/assistant roles"
            },
            {
              id: "messageInput",
              type: "form",
              label: "Message Input",
              description: "Text input area for sending messages",
              fields: [
                {
                  id: "messageText",
                  type: "textarea",
                  label: "Type your message...",
                  description: "Main message input field"
                },
                {
                  id: "modelSelector",
                  type: "dropdown",
                  label: "AI Model",
                  description: "Select which AI model to use",
                  options: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
                },
                {
                  id: "attachmentButton",
                  type: "button",
                  label: "Attach File",
                  description: "Upload images, PDFs, or documents"
                },
                {
                  id: "voiceButton",
                  type: "button",
                  label: "Voice Chat",
                  description: "Start real-time voice conversation"
                },
                {
                  id: "sendButton",
                  type: "button",
                  label: "Send",
                  action: "sendMessage",
                  description: "Sends the message to AI"
                }
              ]
            }
          ]
        }
      ]
    },

    admin: {
      id: "admin",
      path: "/admin",
      name: "Admin Dashboard",
      description: "Administrative interface for system management",
      requiresRole: ["admin", "superadmin"],
      tabs: [
        {
          id: "usersTab",
          label: "Users",
          description: "Manage user accounts and permissions"
        },
        {
          id: "apiKeysTab",
          label: "API Keys",
          description: "Configure OpenAI and ElevenLabs API keys"
        },
        {
          id: "statsTab",
          label: "Statistics",
          description: "View API usage, token consumption, and performance metrics"
        }
      ]
    },

    login: {
      id: "login",
      path: "/login",
      name: "Login Page",
      description: "User authentication interface"
    }
  },

  workflows: {
    createNewChat: {
      id: "createNewChat",
      name: "Create New Chat",
      description: "Start a new conversation",
      steps: [
        { step: 1, action: "Click '+ New Chat' button in sidebar" },
        { step: 2, action: "New conversation appears in list" },
        { step: 3, action: "Chat area clears and waits for first message" }
      ],
      entryPoint: "sidebar.newChatButton"
    },

    sendMessage: {
      id: "sendMessage",
      name: "Send Message to AI",
      description: "Send a message and receive AI response",
      steps: [
        { step: 1, action: "Type message in text area" },
        { step: 2, action: "Optionally select AI model from dropdown" },
        { step: 3, action: "Click send button or press Enter" },
        { step: 4, action: "Message appears in chat" },
        { step: 5, action: "AI streams response in real-time" }
      ],
      entryPoint: "chatArea.messageInput"
    },

    uploadFile: {
      id: "uploadFile",
      name: "Upload File for AI Analysis",
      description: "Upload images, PDFs, or documents for AI to analyze",
      steps: [
        { step: 1, action: "Click attachment button (📎)" },
        { step: 2, action: "Select file from device" },
        { step: 3, action: "File uploads and appears as attachment" },
        { step: 4, action: "Send message with file for AI to analyze" }
      ],
      entryPoint: "chatArea.messageInput.attachmentButton",
      supportedFileTypes: ["image/*", "application/pdf", ".doc", ".docx", ".txt"]
    },

    startVoiceChat: {
      id: "startVoiceChat",
      name: "Start Voice Chat",
      description: "Begin real-time voice conversation with AI",
      steps: [
        { step: 1, action: "Click voice button (🎤)" },
        { step: 2, action: "Grant microphone permission if requested" },
        { step: 3, action: "Speak naturally - AI responds in real-time" },
        { step: 4, action: "Click stop to end voice session" }
      ],
      entryPoint: "chatArea.messageInput.voiceButton",
      requiresPermission: "microphone"
    },

    manageConversations: {
      id: "manageConversations",
      name: "Manage Conversations",
      description: "Rename, pin, or delete conversations",
      steps: [
        { step: 1, action: "Hover over conversation in sidebar" },
        { step: 2, action: "Click three-dot menu (⋮)" },
        { step: 3, action: "Choose action: Rename, Pin/Unpin, or Delete" }
      ],
      entryPoint: "sidebar.conversationList"
    },

    switchAIModel: {
      id: "switchAIModel",
      name: "Switch AI Model",
      description: "Change which AI model processes your messages",
      steps: [
        { step: 1, action: "Click model dropdown in message input area" },
        { step: 2, action: "Select from: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo" },
        { step: 3, action: "New messages use selected model" }
      ],
      entryPoint: "chatArea.messageInput.modelSelector"
    },

    accessAdminPanel: {
      id: "accessAdminPanel",
      name: "Access Admin Panel",
      description: "Open administrative dashboard (admin users only)",
      steps: [
        { step: 1, action: "Click shield icon (🛡️) in sidebar user menu" },
        { step: 2, action: "Navigate to admin dashboard" }
      ],
      entryPoint: "sidebar.userMenu.adminPanel",
      requiresRole: ["admin", "superadmin"]
    }
  },

  features: {
    streaming: {
      id: "streaming",
      name: "Streaming Responses",
      description: "AI responses appear word-by-word in real-time",
      status: "enabled"
    },
    memory: {
      id: "memory",
      name: "AI Memory System",
      description: "AI remembers facts about users across conversations",
      status: "enabled"
    },
    multiModel: {
      id: "multiModel",
      name: "Multiple AI Models",
      description: "Choose from GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo",
      status: "enabled"
    },
    voice: {
      id: "voice",
      name: "Voice Chat",
      description: "Real-time voice conversations using OpenAI Realtime API",
      status: "enabled"
    },
    fileUpload: {
      id: "fileUpload",
      name: "File Upload & Vision",
      description: "Upload images, PDFs, documents for AI analysis",
      status: "enabled"
    },
    conversationManagement: {
      id: "conversationManagement",
      name: "Conversation Management",
      description: "Rename, pin, delete, and organize chat conversations",
      status: "enabled"
    }
  }
};

export const getUISchemaForContext = (userRole, currentPage, currentConversation) => {
  const schema = {
    currentPage: currentPage || "chat",
    availableActions: [],
    visibleComponents: [],
    currentState: {}
  };

  // Add page-specific components
  if (currentPage === "chat") {
    schema.visibleComponents = [
      "sidebar", "conversationList", "newChatButton", 
      "chatArea", "messageInput", "sendButton"
    ];
    schema.availableActions = [
      "createConversation", "sendMessage", "uploadFile", 
      "startVoiceChat", "selectConversation"
    ];
  }

  // Add role-based components
  if (userRole === "admin" || userRole === "superadmin") {
    schema.visibleComponents.push("adminPanelButton");
    schema.availableActions.push("accessAdminPanel");
  }

  // Add conversation state
  if (currentConversation) {
    schema.currentState = {
      conversationId: currentConversation.id,
      conversationTitle: currentConversation.title,
      messageCount: currentConversation.messageCount || 0,
      model: currentConversation.model
    };
  }

  return schema;
};
