import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

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

// Import WebSocket
import { createVoiceWebSocketServer } from './websocket/voice.js';

const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3000);

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https://api.openai.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
}));

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

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
