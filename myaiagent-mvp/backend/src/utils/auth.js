import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Validate and get JWT secret (lazy validation)
function getJWTSecret() {
  if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters long!');
    process.exit(1);
  }

  return process.env.JWT_SECRET;
}

const JWT_EXPIRY = process.env.SESSION_DURATION_HOURS || 24;

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
  };

  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: `${JWT_EXPIRY}h`,
  });
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Extract token from header
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
