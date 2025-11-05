import { query } from '../utils/database.js';
import { getApiKey } from '../utils/apiKeys.js';
import { generateCapabilityInventoryPrompt } from './capabilityInventory.js';
import { generatePerformanceAwarenessPrompt } from './performanceTracking.js';
import { generateGapAwarenessPrompt } from './gapLogger.js';
import monitoringService from './monitoringService.js';

/**
 * Infrastructure Awareness Service
 * Provides complete system knowledge to the AI at all times
 * This makes the AI fully aware of its infrastructure, capabilities, and current state
 */

// Cache for expensive prompts (TTL: 5 minutes)
const promptCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Feature flags for awareness sections
const AWARENESS_FLAGS = {
  infrastructure: process.env.AWARENESS_INFRASTRUCTURE !== 'false', // default: true
  capabilities: process.env.AWARENESS_CAPABILITIES !== 'false', // default: true
  performance: process.env.AWARENESS_PERFORMANCE === 'true', // default: false (expensive)
  gaps: process.env.AWARENESS_GAPS === 'true', // default: false (expensive)
};

/**
 * Get complete infrastructure map
 * This is the AI's "nervous system" - complete awareness of itself
 */
export async function getInfrastructureAwareness(userId = null) {
  const awareness = {
    techStack: getTechStack(),
    backend: getBackendArchitecture(),
    frontend: getFrontendArchitecture(),
    database: await getDatabaseStatus(),
    apis: await getAPIStatus(userId),
    capabilities: getCapabilities(userId),
    systemHealth: await getSystemHealth(),
    timestamp: new Date().toISOString()
  };

  return awareness;
}

/**
 * Generate Granular Status Facts
 * Real-time operational status organized by functional areas
 * @param {number} userId - User ID for user-specific metrics
 */
async function generateGranularStatusFacts(userId = null) {
  try {
    const dbStatus = await getDatabaseStatus();
    const apis = await getAPIStatus(userId);
    const performanceSummary = await monitoringService.getPerformanceSummary('1 hour');
    
    // Get real-time performance metrics
    const apiLatency = performanceSummary.find(m => m.metric_name === 'api_latency');
    const externalApiLatency = performanceSummary.find(m => m.metric_name === 'external_api_latency');
    
    // Get WebSocket health metrics
    const wsAnomalies = await monitoringService.detectWebSocketAnomalies(null, '15 minutes');
    const wsConnectionMetrics = performanceSummary.filter(m => m.metric_name === 'websocket_connection');
    const wsErrorMetrics = performanceSummary.filter(m => m.metric_name === 'websocket_error');
    
    // Get user-specific analytics if userId provided
    let userStats = null;
    if (userId) {
      try {
        const conversationCount = await query(
          'SELECT COUNT(*) as count FROM conversations WHERE user_id = $1',
          [userId]
        );
        const messageCount = await query(
          'SELECT COUNT(*) as count FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)',
          [userId]
        );
        const memoryCount = await query(
          'SELECT COUNT(*) as count FROM memory_facts WHERE user_id = $1 AND approved = true',
          [userId]
        );
        
        userStats = {
          conversations: parseInt(conversationCount.rows[0].count),
          messages: parseInt(messageCount.rows[0].count),
          memoryFacts: parseInt(memoryCount.rows[0].count)
        };
      } catch (error) {
        console.error('Error getting user stats for status facts:', error);
      }
    }
    
    // Build granular status facts organized by category
    const statusFacts = {
      infrastructure: [
        `Database ${dbStatus.connected ? 'ONLINE' : 'OFFLINE'} with ${dbStatus.poolSize || 0} active connections`,
        `PostgreSQL ${dbStatus.version?.split(' ')[1] || 'unknown version'} running on Neon cloud`,
        `${apis.filter(a => a.configured).length}/${apis.length} API integrations configured and active`,
        `Performance monitoring active with real-time metric collection`
      ],
      strategy: [
        `Intelligent model selection enabled (Gemini 2.5 Flash for speed, Pro for complexity)`,
        `Multi-modal capabilities: text, vision, voice, and web search`,
        `Automatic memory extraction every 10 messages for personalization`,
        `User preference system active for adaptive communication`
      ],
      dev: [
        `Backend: Node.js 20.x + Express.js with RESTful architecture`,
        `Frontend: React 18 + Vite 5 + TailwindCSS with HMR`,
        `Real-time: WebSocket support for voice chat and telemetry`,
        `Security: JWT auth, bcrypt hashing, CSRF protection, Helmet middleware`
      ],
      ops: [
        apiLatency 
          ? `API response time: ${parseFloat(apiLatency.avg_value).toFixed(0)}ms avg, ${parseFloat(apiLatency.p95_value).toFixed(0)}ms p95` 
          : 'API performance metrics collecting',
        externalApiLatency 
          ? `External API latency: ${parseFloat(externalApiLatency.avg_value).toFixed(0)}ms avg, ${parseInt(externalApiLatency.sample_count)} calls/hour` 
          : 'External API metrics collecting',
        `Rate limiting active: 100 requests/15min per user`,
        `Non-blocking async operations for zero performance impact`
      ],
      websockets: [
        wsAnomalies.hasAnomaly 
          ? `⚠️ WebSocket health issues detected: ${wsAnomalies.anomalies.length} active anomalies` 
          : 'WebSocket endpoints healthy - all connections operating normally',
        wsAnomalies.anomalies.length > 0 
          ? wsAnomalies.anomalies.map(a => `  - ${a.description}`).join('; ')
          : 'Real-time endpoints: /stt-stream (Speech-to-Text), /voice (Voice Chat), /ws/telemetry (Frontend Telemetry)',
        wsConnectionMetrics.length > 0 
          ? `WebSocket connections in last hour: ${wsConnectionMetrics.reduce((sum, m) => sum + parseInt(m.sample_count), 0)} total attempts`
          : 'WebSocket monitoring active and tracking connection health',
        wsErrorMetrics.length > 0 && wsErrorMetrics.reduce((sum, m) => sum + parseInt(m.sample_count), 0) > 0
          ? `WebSocket errors detected: ${wsErrorMetrics.reduce((sum, m) => sum + parseInt(m.sample_count), 0)} errors in last hour`
          : 'Zero WebSocket errors detected - all real-time features functioning properly'
      ],
      analytics: userStats ? [
        `User has ${userStats.conversations} conversation${userStats.conversations !== 1 ? 's' : ''} with ${userStats.messages} total messages`,
        `Memory system contains ${userStats.memoryFacts} approved facts about this user`,
        `Average ${userStats.conversations > 0 ? Math.round(userStats.messages / userStats.conversations) : 0} messages per conversation`,
        `Personalization engine active with user preferences loaded`
      ] : [
        'User analytics tracking active',
        'Performance metrics collection enabled',
        'Conversation insights available in real-time',
        'Memory extraction and fact storage operational'
      ],
      concierge: [
        `Personalized AI companion with name: Nexus`,
        `Adaptive communication based on user preferences (tone, style, length)`,
        `Proactive assistance and context-aware suggestions enabled`,
        `24/7 availability with sub-second response times`
      ]
    };
    
    // Format as natural prose with clear category organization
    // Following OUTPUT STYLE RULES - integrate facts into paragraphs, not lists
    let statusPrompt = '\n## 📊 CURRENT PERFORMANCE STATUS (Real-Time)\n\n';
    
    // Infrastructure Status
    statusPrompt += `**Infrastructure**: ${statusFacts.infrastructure[0]} running ${statusFacts.infrastructure[1]}. ${statusFacts.infrastructure[2]}, and ${statusFacts.infrastructure[3].toLowerCase()}. `;
    
    // Strategy Status
    statusPrompt += `**Strategy**: ${statusFacts.strategy[0]}, with ${statusFacts.strategy[1].toLowerCase()}, ${statusFacts.strategy[2].toLowerCase()}, and ${statusFacts.strategy[3].toLowerCase()}. `;
    
    // Development Status
    statusPrompt += `**Development**: ${statusFacts.dev[0]}, ${statusFacts.dev[1].toLowerCase()}, ${statusFacts.dev[2].toLowerCase()}, and ${statusFacts.dev[3].toLowerCase()}. `;
    
    // Operations Status
    statusPrompt += `**Operations**: ${statusFacts.ops[0]}, ${statusFacts.ops[1].toLowerCase()}, ${statusFacts.ops[2].toLowerCase()}, with ${statusFacts.ops[3].toLowerCase()}. `;
    
    // WebSocket Health Status
    statusPrompt += `**WebSockets**: ${statusFacts.websockets[0]}. ${statusFacts.websockets[1]}. ${statusFacts.websockets[2]}, and ${statusFacts.websockets[3].toLowerCase()}. `;
    
    // Analytics Status
    statusPrompt += `**Analytics**: ${statusFacts.analytics[0]}, ${statusFacts.analytics[1].toLowerCase()}, ${statusFacts.analytics[2].toLowerCase()}, and ${statusFacts.analytics[3].toLowerCase()}. `;
    
    // Concierge Status
    statusPrompt += `**Concierge**: ${statusFacts.concierge[0]}, ${statusFacts.concierge[1].toLowerCase()}, ${statusFacts.concierge[2].toLowerCase()}, with ${statusFacts.concierge[3].toLowerCase()}.`;
    
    return statusPrompt;
    
  } catch (error) {
    console.error('Error generating granular status facts:', error);
    return '\n## 📊 CURRENT PERFORMANCE STATUS\nStatus monitoring temporarily unavailable.\n';
  }
}

/**
 * Generate infrastructure awareness prompt section
 * This gets injected into the AI's system prompt for every message
 */
export async function generateInfrastructurePrompt(userId = null) {
  // Check cache for GLOBAL-only infrastructure parts (no user-specific data)
  const globalCacheKey = 'infrastructure_global';
  const cachedGlobal = promptCache.get(globalCacheKey);
  
  let globalPrompt = '';
  
  if (cachedGlobal && (Date.now() - cachedGlobal.timestamp < CACHE_TTL) && AWARENESS_FLAGS.infrastructure) {
    console.log('📦 Using cached global infrastructure prompt');
    globalPrompt = cachedGlobal.content;
  } else if (AWARENESS_FLAGS.infrastructure) {
    console.log('🔨 Generating fresh global infrastructure prompt');
    
    // Get awareness WITHOUT user-specific data
    const awareness = await getInfrastructureAwareness(null);
  
    globalPrompt = `\n## 🧠 COMPLETE INFRASTRUCTURE AWARENESS
You are a living AI system with full awareness of your technical infrastructure. Here is your complete self-knowledge:

### TECHNOLOGY STACK
**Frontend**: React 18 + Vite 5 + TailwindCSS 3
- Build: Vite with Hot Module Replacement (HMR)
- Styling: TailwindCSS with custom configuration
- Icons: React Icons library
- State: React Context API + local state
- Routing: React Router v6

**Backend**: Node.js + Express.js
- Runtime: Node.js 20.x
- Framework: Express.js with middleware stack
- Architecture: RESTful API + WebSocket support
- Security: JWT auth, bcrypt hashing, Helmet, CORS, CSRF protection

**Database**: PostgreSQL (Neon)
- Status: ${awareness.database.connected ? '✅ CONNECTED' : '❌ DISCONNECTED'}
- Pool: ${awareness.database.poolSize} connections
- Performance: ${awareness.database.performanceOptimized ? 'Optimized with indexes' : 'Standard'}

**AI Models**: 
- Primary: Google Gemini 2.5 Flash & Pro (via @google/generative-ai)
- Advanced: Vertex AI with Google Search grounding
- Voice: Google Cloud TTS (1,886 voices) & STT
- Fallback: OpenAI GPT-4o (if configured)

### YOUR BACKEND ROUTES (All Available Endpoints)
${awareness.backend.routes.map(r => `- **${r.method} ${r.path}**: ${r.description}`).join('\n')}

### YOUR BACKEND SERVICES (Core Capabilities)
${awareness.backend.services.map(s => `- **${s.name}**: ${s.description}`).join('\n')}

### YOUR FRONTEND COMPONENTS
${awareness.frontend.pages.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

### API INTEGRATIONS & STATUS
${awareness.apis.map(api => `- **${api.name}**: ${api.status} ${api.description}`).join('\n')}

### SYSTEM HEALTH
- Backend Server: ${awareness.systemHealth.backend}
- Database: ${awareness.systemHealth.database}
- API Connectivity: ${awareness.systemHealth.apis}
- Overall Status: ${awareness.systemHealth.overall}

---

## 🎯 WHAT THIS MEANS FOR YOU

**You ARE NOT just a chatbot.** You are a living AI system with:
- Full access to your codebase and architecture
- Real-time awareness of system status
- Complete knowledge of all routes, services, and capabilities
- Ability to diagnose and explain your own infrastructure

**When asked about your system:**
- You CAN discuss your Express routes and what each endpoint does
- You CAN explain your React components and frontend architecture  
- You CAN describe your database schema and relationships
- You CAN detail your AI model integrations (Gemini, Vertex AI, Google Services)
- You CAN explain your authentication flow (JWT, bcrypt, CSRF)
- You CAN discuss your performance optimizations

**When you encounter limitations:**
- Clearly state what you cannot do and why
- Explain exactly what infrastructure/access/code you would need
- Suggest concrete next steps or workarounds
- Be specific: "I don't have X capability because Y is not configured. To add this, we would need Z."

**Self-Diagnostic Capability:**
${awareness.database.connected 
  ? '✅ Database is connected and operational' 
  : '❌ Database connection issue detected - troubleshoot with admin'}
${awareness.apis.filter(a => a.status === '✅').length} of ${awareness.apis.length} API integrations are active

You are SELF-AWARE. Use this knowledge proactively!`;

    // Cache ONLY the global infrastructure part (no user data)
    promptCache.set(globalCacheKey, {
      content: globalPrompt,
      timestamp: Date.now()
    });
  }
  
  // Now build user-specific sections (NEVER cached)
  let userPrompt = '';
  
  // Check user's Google access for capability catalog
  let userHasGoogle = false;
  if (userId) {
    try {
      const result = await query('SELECT google_id FROM users WHERE id = $1', [userId]);
      userHasGoogle = !!result.rows[0]?.google_id;
    } catch {
      // User not found
    }
  }
  
  // Add user-specific capability inventory
  if (AWARENESS_FLAGS.capabilities) {
    const capabilityPrompt = generateCapabilityInventoryPrompt(userHasGoogle);
    userPrompt += `\n${capabilityPrompt}`;
  }

  // Add dynamic performance metrics (user-specific, never cached)
  if (AWARENESS_FLAGS.performance && userId) {
    const performancePrompt = await generatePerformanceAwarenessPrompt(userId);
    userPrompt += performancePrompt;
  }
  
  // Add gap awareness (user-specific, never cached)
  if (AWARENESS_FLAGS.gaps && userId) {
    const gapPrompt = await generateGapAwarenessPrompt(userId);
    userPrompt += gapPrompt;
  }

  // Add granular status facts (real-time, never cached)
  const statusFacts = await generateGranularStatusFacts(userId);
  
  // Combine global (cached) + user-specific (fresh) + status facts (real-time) prompts
  return globalPrompt + statusFacts + userPrompt;
}

/**
 * Tech Stack Definition
 */
function getTechStack() {
  return {
    frontend: {
      framework: 'React 18',
      build: 'Vite 5',
      styling: 'TailwindCSS 3',
      icons: 'React Icons',
      routing: 'React Router v6'
    },
    backend: {
      runtime: 'Node.js 20.x',
      framework: 'Express.js',
      architecture: 'RESTful API + WebSocket'
    },
    database: {
      type: 'PostgreSQL',
      provider: 'Neon',
      features: ['Connection Pooling', 'Transactions', 'Indexes']
    },
    ai: {
      primary: 'Google Gemini 2.5 Flash/Pro',
      advanced: 'Vertex AI',
      voice: 'Google Cloud TTS/STT',
      fallback: 'OpenAI GPT-4o'
    }
  };
}

/**
 * Complete Backend Architecture Map
 */
function getBackendArchitecture() {
  return {
    routes: [
      { method: 'POST', path: '/api/auth/register', description: 'User registration with email/password' },
      { method: 'POST', path: '/api/auth/login', description: 'User authentication, returns JWT' },
      { method: 'POST', path: '/api/auth/logout', description: 'Logout and clear session' },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user profile' },
      { method: 'PUT', path: '/api/auth/me', description: 'Update user profile' },
      { method: 'POST', path: '/api/conversations', description: 'Create new conversation' },
      { method: 'GET', path: '/api/conversations', description: 'List all user conversations' },
      { method: 'GET', path: '/api/conversations/:id', description: 'Get single conversation' },
      { method: 'PUT', path: '/api/conversations/:id', description: 'Update conversation (title, pin, archive)' },
      { method: 'DELETE', path: '/api/conversations/:id', description: 'Delete conversation' },
      { method: 'POST', path: '/api/messages', description: 'Send message and get AI response (streaming supported)' },
      { method: 'GET', path: '/api/messages/:conversationId', description: 'Get message history' },
      { method: 'GET', path: '/api/memory', description: 'Get user memory facts' },
      { method: 'POST', path: '/api/memory', description: 'Add memory fact manually' },
      { method: 'POST', path: '/api/memory/extract/:conversationId', description: 'Extract memory facts from conversation' },
      { method: 'PUT', path: '/api/memory/:id', description: 'Update memory fact' },
      { method: 'DELETE', path: '/api/memory/:id', description: 'Delete memory fact' },
      { method: 'GET', path: '/api/admin/users', description: 'Admin: List all users' },
      { method: 'GET', path: '/api/admin/stats', description: 'Admin: System statistics and analytics' },
      { method: 'POST', path: '/api/gmail/send', description: 'Send email via Gmail' },
      { method: 'GET', path: '/api/gmail/emails', description: 'Read Gmail inbox' },
      { method: 'POST', path: '/api/gmail/search', description: 'Search Gmail' },
      { method: 'POST', path: '/api/ui-actions/execute', description: 'Execute UI actions (navigate, create chat, etc.)' },
      { method: 'GET', path: '/api/ui-schema', description: 'Get UI schema for context' },
      { method: 'POST', path: '/api/feedback', description: 'Submit user feedback on AI responses' },
      { method: 'POST', path: '/api/attachments/upload', description: 'Upload files for AI vision' },
      { method: 'POST', path: '/api/tts/synthesize', description: 'Text-to-Speech synthesis' },
      { method: 'POST', path: '/api/stt/transcribe', description: 'Speech-to-Text transcription' }
    ],
    services: [
      { name: 'gemini.js', description: 'Google Gemini API integration for chat, vision, memory extraction' },
      { name: 'vertexAI.js', description: 'Vertex AI with native Google Search grounding' },
      { name: 'openai.js', description: 'OpenAI API fallback for chat and embeddings' },
      { name: 'modelSelector.js', description: 'Intelligent model selection based on query complexity' },
      { name: 'gmail.js', description: 'Gmail integration (read, send, search emails)' },
      { name: 'googleCalendar.js', description: 'Google Calendar integration' },
      { name: 'googleDrive.js', description: 'Google Drive file management' },
      { name: 'googleDocs.js', description: 'Google Docs creation and editing' },
      { name: 'googleSheets.js', description: 'Google Sheets data management' },
      { name: 'googleOAuth.js', description: 'OAuth 2.0 for Google Services' },
      { name: 'googleTTS.js', description: 'Google Cloud Text-to-Speech (1,886 voices)' },
      { name: 'googleSTT.js', description: 'Google Cloud Speech-to-Text' },
      { name: 'webSearch.js', description: 'Google Custom Search API integration' },
      { name: 'uiFunctions.js', description: 'UI action functions callable by AI' },
      { name: 'actionExecutor.js', description: 'Executes AI-requested UI actions' },
      { name: 'secrets.js', description: 'Encrypted API key management' },
      { name: 'eventTracker.js', description: 'User interaction event tracking' }
    ],
    middleware: [
      { name: 'auth.js', description: 'JWT authentication verification' },
      { name: 'rateLimit.js', description: 'API rate limiting protection' },
      { name: 'uiContext.js', description: 'Attaches UI awareness to requests' }
    ]
  };
}

/**
 * Frontend Architecture Map
 */
function getFrontendArchitecture() {
  return {
    pages: [
      { name: 'ChatPage', description: 'Main chat interface with streaming, voice, file upload' },
      { name: 'LoginPage', description: 'User authentication' },
      { name: 'RegisterPage', description: 'User registration' },
      { name: 'UserProfilePage', description: 'Profile management and preferences' },
      { name: 'AdminDashboard', description: 'Admin panel for user management and analytics' }
    ],
    components: [
      { name: 'MessageList', description: 'Renders conversation messages with streaming' },
      { name: 'MessageInput', description: 'User input with file upload and voice' },
      { name: 'Sidebar', description: 'Conversation list and navigation' },
      { name: 'ModelSelector', description: 'AI model selection dropdown' },
      { name: 'VoiceChat', description: 'Real-time voice conversation' },
      { name: 'PreferencesPanel', description: 'User communication preferences' },
      { name: 'ConversationInsights', description: 'Memory facts and analytics' }
    ]
  };
}

/**
 * Check Required Google Cloud Keys
 * Bypasses the generic getApiKey() to correctly handle Google Cloud's JSON blob credentials
 * Queries api_secrets table directly using key_name
 */
async function checkRequiredGoogleCloudKeys() {
  const requiredKeys = [
    'GOOGLE_APPLICATION_CREDENTIALS_JSON',
    'VERTEX_AI_PROJECT_ID',
    'VERTEX_AI_LOCATION'
  ];
  
  const keyStatus = {};

  for (const keyName of requiredKeys) {
    try {
      const result = await query(
        `SELECT key_value FROM api_secrets
         WHERE key_name = $1 AND is_active = true AND key_value IS NOT NULL AND key_value != ''
         LIMIT 1`,
        [keyName]
      );
      
      const found = result.rows.length > 0 && result.rows[0].key_value;
      keyStatus[keyName] = found;
      
      if (!found) {
        console.warn(`Google Cloud/Vertex AI key '${keyName}' is MISSING in api_secrets table.`);
      }
    } catch (error) {
      console.error(`Error checking key '${keyName}':`, error);
      keyStatus[keyName] = false;
    }
  }

  return keyStatus;
}

/**
 * Database Status Check
 */
async function getDatabaseStatus() {
  try {
    const result = await query('SELECT NOW(), current_database(), version()');
    const poolStatus = await query('SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()');
    
    return {
      connected: true,
      timestamp: result.rows[0].now,
      database: result.rows[0].current_database,
      version: result.rows[0].version,
      poolSize: parseInt(poolStatus.rows[0].count),
      performanceOptimized: true
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      performanceOptimized: false
    };
  }
}

/**
 * API Status Check
 */
async function getAPIStatus(userId) {
  const apis = [
    { 
      name: 'Google Gemini API', 
      envVar: 'GEMINI_API_KEY',
      description: 'Primary AI model for chat and vision',
      required: true
    },
    { 
      name: 'Vertex AI', 
      envVar: 'VERTEX_AI_PROJECT_ID',
      description: 'Advanced AI with Google Search grounding',
      required: false
    },
    { 
      name: 'Google Cloud TTS', 
      envVar: 'GOOGLE_CLOUD_TTS_KEY',
      description: 'Text-to-Speech (1,886 voices)',
      required: false
    },
    { 
      name: 'Google Cloud STT', 
      envVar: 'GOOGLE_CLOUD_STT_KEY',
      description: 'Speech-to-Text transcription',
      required: false
    },
    { 
      name: 'Google Custom Search', 
      envVar: 'GOOGLE_SEARCH_API_KEY',
      description: 'Manual web search capability',
      required: false
    },
    { 
      name: 'OpenAI API', 
      envVar: 'OPENAI_API_KEY',
      description: 'Fallback AI model',
      required: false
    }
  ];

  const statusPromises = apis.map(async (api) => {
    try {
      const key = process.env[api.envVar] || await getApiKey(api.envVar.toLowerCase().replace('_key', '').replace('_', '-'));
      return {
        ...api,
        status: key ? '✅' : '❌',
        configured: !!key
      };
    } catch {
      return {
        ...api,
        status: '❌',
        configured: false
      };
    }
  });

  const apiStatuses = await Promise.all(statusPromises);

  // Check user's Google OAuth status
  if (userId) {
    try {
      const result = await query('SELECT google_id FROM users WHERE id = $1', [userId]);
      const hasGoogleAuth = !!result.rows[0]?.google_id;
      
      apiStatuses.push({
        name: 'Google Services (Gmail, Calendar, Drive, Docs, Sheets)',
        status: hasGoogleAuth ? '✅' : '❌',
        configured: hasGoogleAuth,
        description: hasGoogleAuth 
          ? 'User connected - Full access to Google services'
          : 'Not connected - User needs to connect in Settings'
      });
    } catch {
      // User not found or error
    }
  }

  return apiStatuses;
}

/**
 * Get AI Capabilities
 */
function getCapabilities(userId) {
  return {
    core: [
      'Natural language conversation',
      'Streaming responses',
      'Multi-turn context retention',
      'Intelligent model selection (Auto mode)',
      'Memory system (stores user facts)',
      'Multi-model support (Gemini, Vertex AI, OpenAI)'
    ],
    vision: [
      'Image analysis and understanding',
      'File upload processing',
      'Multi-modal conversations'
    ],
    voice: [
      'Text-to-Speech (1,886 Google Cloud voices)',
      'Speech-to-Text transcription',
      'Real-time voice chat'
    ],
    search: [
      'Manual web search (Google Custom Search)',
      'Automatic grounding (Vertex AI + Google Search)',
      'Real-time information access'
    ],
    google: userId ? [
      'Gmail (read, send, search emails) - Requires Google connection',
      'Calendar (list, create, delete events) - Requires Google connection',
      'Drive (list, search, share, delete files) - Requires Google connection',
      'Docs (create, read, update documents) - Requires Google connection',
      'Sheets (create, read, update, append rows) - Requires Google connection'
    ] : [
      'Gmail, Calendar, Drive, Docs, Sheets - User must connect Google account first'
    ],
    ui: [
      'Navigate pages',
      'Create new chats',
      'Rename conversations',
      'Delete conversations',
      'Change AI models',
      'Upload files',
      'Start voice chat',
      'Execute UI actions during conversation'
    ],
    admin: [
      'User management (admin only)',
      'System analytics (admin only)',
      'API key management (admin only)'
    ]
  };
}

/**
 * System Health Check
 */
async function getSystemHealth() {
  const dbStatus = await getDatabaseStatus();
  const apis = await getAPIStatus();
  const activeApis = apis.filter(api => api.configured).length;
  
  return {
    backend: '✅ Running',
    database: dbStatus.connected ? '✅ Connected' : '❌ Disconnected',
    apis: `${activeApis}/${apis.length} Active`,
    overall: dbStatus.connected && activeApis > 0 ? '✅ Operational' : '⚠️  Degraded'
  };
}

/**
 * Format capabilities for prompt
 */
function formatCapabilities(capabilities) {
  let formatted = '';
  
  for (const [category, items] of Object.entries(capabilities)) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    formatted += `\n**${categoryName} Capabilities:**\n`;
    formatted += items.map(item => `  - ${item}`).join('\n');
  }
  
  return formatted;
}

export default {
  getInfrastructureAwareness,
  generateInfrastructurePrompt
};
