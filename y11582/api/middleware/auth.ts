
import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, UserRole } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'queue-service-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

export function signToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  FINANCE_MANAGER: 'finance_manager' as UserRole,
  OPERATOR: 'operator' as UserRole,
  VIEWER: 'viewer' as UserRole,
};

export const PERMISSIONS = {
  READ: [ROLES.ADMIN, ROLES.FINANCE_MANAGER, ROLES.OPERATOR, ROLES.VIEWER],
  WRITE: [ROLES.ADMIN, ROLES.FINANCE_MANAGER, ROLES.OPERATOR],
  MANAGE: [ROLES.ADMIN, ROLES.FINANCE_MANAGER],
  ADMIN_ONLY: [ROLES.ADMIN],
};
