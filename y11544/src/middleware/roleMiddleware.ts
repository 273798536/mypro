import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

export function roleAuth(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = (req.headers['x-user-role'] as UserRole) || UserRole.OPERATOR;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role ${role} does not have permission to access this resource`
      });
    }

    req.user = {
      id: (req.headers['x-user-id'] as string) || 'anonymous',
      role
    };

    next();
  };
}

export function getRoleFromRequest(req: AuthenticatedRequest): UserRole {
  return (req.headers['x-user-role'] as UserRole) || UserRole.OPERATOR;
}

export function getUserIdFromRequest(req: AuthenticatedRequest): string {
  return (req.headers['x-user-id'] as string) || 'anonymous';
}
