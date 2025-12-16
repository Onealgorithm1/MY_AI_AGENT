import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// SECURITY: Read secrets lazily to avoid ES6 import hoisting issues
// dotenv.config() runs in server.js before this module is used
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function getJwtExpiry() {
  return process.env.SESSION_DURATION_HOURS || 24;
}

// Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id || null,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${getJwtExpiry()}h`,
  });
}

// Generate short-lived WebSocket token (5 minutes)
// Used for WebSocket authentication when HTTP-only cookies can't be used
export function generateWebSocketToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    ws: true, // Mark as WebSocket token
  };
  
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '5m', // 5 minutes
  });
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Extract token from cookie or header
// SECURITY: Prioritize HTTP-only cookie (secure), fallback to Authorization header (backward compatibility)
export function extractToken(req) {
  // First, check HTTP-only cookie (secure method)
  if (req.cookies && req.cookies.jwt) {
    return req.cookies.jwt;
  }
  
  // Fallback to Authorization header for backward compatibility
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}
