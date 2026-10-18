import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/storage';

const JWT_SECRET = process.env.JWT_SECRET || 'luxeattire_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'luxeattire_super_secret_jwt_refresh_key_2026';

export interface AuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'SALES_MANAGER' | 'ADMIN';
  permissions?: string[];
  name: string;
  phone?: string;
  isVerified: boolean;
  sessionVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(user: { id: string; email: string; role: string; permissions?: string[]; name: string; sessionVersion?: number }) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    name: user.name,
    sessionVersion: user.sessionVersion || 1,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

// Authentication Middleware
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
      code: 'UNAUTHORIZED',
    });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Access token expired or invalid.',
      code: 'TOKEN_INVALID',
    });
  }

  const user = await db.users.findById(decoded.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Account no longer exists.',
      code: 'USER_NOT_FOUND',
    });
  }

  if (user.sessionVersion && decoded.sessionVersion && user.sessionVersion !== decoded.sessionVersion) {
    return res.status(401).json({
      success: false,
      message: 'Session has been invalidated. Please log in again.',
      code: 'SESSION_REVOKED',
    });
  }

  req.user = {
    id: user._id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    name: user.name,
    isVerified: !!user.isVerified,
    sessionVersion: user.sessionVersion || 1,
  };

  next();
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      const user = await db.users.findById(decoded.id);
      if (user) {
        req.user = {
          id: user._id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          name: user.name,
          isVerified: !!user.isVerified,
          sessionVersion: user.sessionVersion || 1,
        };
      }
    }
  }
  next();
}

// Role Middleware
export function requireRole(...allowedRoles: Array<'CUSTOMER' | 'SALES_MANAGER' | 'ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.', code: 'UNAUTHORIZED' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not possess the required privileges.',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

// Granular Permission Middleware
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.', code: 'UNAUTHORIZED' });
    }

    // Admins always have all permissions
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check specific sales manager permission
    if (req.user.role === 'SALES_MANAGER') {
      const hasPerm = req.user.permissions?.includes(permission);
      if (hasPerm) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Missing required permission '${permission}'.`,
      code: 'PERMISSION_DENIED',
    });
  };
}

// Audit Logging helper
export async function logAuditEvent(actor: { id: string; name: string; email: string; role: string }, action: string, entity: string, entityId?: string, metadata?: any) {
  try {
    await db.auditLogs.create({
      actor,
      action,
      entity,
      entityId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Audit Log] Failed to record audit log:', err);
  }
}
