import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Load environment variables
dotenv.config();

// SECURITY: Validate required secrets immediately after loading .env
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"');
  process.exit(1);
}
if (!process.env.CSRF_SECRET && !process.env.HMAC_SECRET) {
  console.error('❌ FATAL: CSRF_SECRET or HMAC_SECRET environment variable is required');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import googleAuthRoutes from './routes/google-auth.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import memoryRoutes from './routes/memory.js';
import attachmentRoutes from './routes/attachments.js';
import feedbackRoutes from './routes/feedback.js';
import adminRoutes from './routes/admin.js';
import secretsRoutes from './routes/secrets.js';
import uiSchemaRoutes from './routes/ui-schema.js';
import uiActionsRoutes from './routes/ui-actions.js';
import eventsRoutes from './routes/events.js';
import toolsRoutes from './routes/tools.js';
import gmailRoutes from './routes/gmail.js';
import ttsRoutes from './routes/tts.js';
import sttRoutes from './routes/stt.js';
import plankaRoutes from './routes/planka.js';
import plankaAuthRoutes from './routes/planka-auth.js';

// Import WebSocket
import { createVoiceWebSocketServer } from './websocket/voice.js';

const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3000);

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'", 
        'wss:', 
        'ws:', 
        'https://api.openai.com',
        'https://generativelanguage.googleapis.com',
        'https://speech.googleapis.com',
        'https://texttospeech.googleapis.com',
        'https://api.elevenlabs.io',
        'https://api.elevenlabs.com'
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"], // Replaces X-Frame-Options
    },
  },
  xssFilter: false, // Remove x-xss-protection header (deprecated)
  frameguard: false, // Disable X-Frame-Options (using CSP frame-ancestors instead)
}));

// Add cache control and charset headers
app.use((req, res, next) => {
  // Set charset for all JSON responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  // Cache control for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.startsWith('/api/')) {
    // No cache for API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  
  next();
});

// CORS - Only needed in development when frontend and backend are on different ports
if (process.env.NODE_ENV !== 'production') {
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'];

  // Add Replit development domain if available
  if (process.env.REPLIT_DEV_DOMAIN) {
    allowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin requests, mobile apps, curl, Postman)
      if (!origin) {
        callback(null, true);
      } 
      // Allow requests from explicitly allowed origins
      else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } 
      // Reject all other origins in development
      else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
} else {
  // In production, frontend and backend are served from same origin on Replit Autoscale
  // CORS is not needed and should be disabled for security
  app.use(cors({
    origin: false,
    credentials: true,
  }));
}

// Cookie parsing (REQUIRED for JWT cookies and CSRF)
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// CSRF Protection (SECURITY: Protects against Cross-Site Request Forgery)
const csrfSecret = process.env.CSRF_SECRET || process.env.HMAC_SECRET;
const {
  generateToken: generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: 'csrf-token',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // lax for dev compatibility
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development for now
  skip: (req) => process.env.NODE_ENV !== 'production',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Serve uploaded files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// CSRF Token endpoint (public, no authentication required)
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Apply CSRF protection to all state-changing API requests
// NOTE: GET, HEAD, OPTIONS are automatically excluded by csrf-csrf
app.use('/api/', doubleCsrfProtection);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/secrets', secretsRoutes);
app.use('/api/ui-schema', uiSchemaRoutes);
app.use('/api/ui-actions', uiActionsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/stt', sttRoutes);
app.use('/api/planka', plankaRoutes);
app.use('/api/planka-auth', plankaAuthRoutes);

// Proxy to Planka UI server on port 3002
app.use('/planka-ui', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/planka-ui': '',
  },
  onError: (err, req, res) => {
    console.error('Planka proxy error:', err.message);
    res.status(503).json({ error: 'Planka service unavailable' });
  },
}));

// Proxy Planka static assets (build folder, favicons, etc.)
app.use('/build', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Build assets proxy error:', err.message);
    res.status(503).send('Build assets unavailable');
  },
}));

app.use('/favicons', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
}));

app.use('/user-avatars', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
}));

app.use('/background-images', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
}));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/voice')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Root endpoint in development
  app.get('/', (req, res) => {
    res.json({
      name: 'My AI Agent API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        conversations: '/api/conversations',
        messages: '/api/messages',
        memory: '/api/memory',
        attachments: '/api/attachments',
        feedback: '/api/feedback',
        admin: '/api/admin',
        secrets: '/api/secrets',
        voice: 'ws://localhost:3000/voice',
      },
    });
  });
}

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Endpoint not found' });
  } else {
    res.status(404).send('Not found');
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Log to database
  if (req.user) {
    import('./utils/database.js').then(({ query }) => {
      query(
        `INSERT INTO error_logs (user_id, error_type, error_message, error_stack, request_url, request_method, status_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          err.name || 'UnknownError',
          err.message,
          err.stack,
          req.url,
          req.method,
          err.statusCode || 500,
        ]
      ).catch(console.error);
    });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server for voice
createVoiceWebSocketServer(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 My AI Agent - Backend Server');
  console.log('='.repeat(50));
  console.log(`\n📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📍 Endpoints:`);
  console.log(`   - API: http://localhost:${PORT}/api`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Voice WebSocket: ws://localhost:${PORT}/voice`);
  console.log(`\n🔑 OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log('\n' + '='.repeat(50) + '\n');
});

export default app;
