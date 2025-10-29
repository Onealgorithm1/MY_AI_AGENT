import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import memoryRoutes from './routes/memory.js';
import attachmentRoutes from './routes/attachments.js';
import feedbackRoutes from './routes/feedback.js';
import adminRoutes from './routes/admin.js';
import secretsRoutes from './routes/secrets.js';

// Import WebSocket
import { createVoiceWebSocketServer } from './websocket/voice.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/secrets', secretsRoutes);

// Root endpoint
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
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
