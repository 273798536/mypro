import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../types';
import { hasPermission, canViewField, getRolePermissions } from '../config/roles';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const mockUsers: Record<string, User> = {
  'entry-1': { id: 'entry-1', name: '张三-录入员', role: UserRole.DATA_ENTRY },
  'reviewer-1': { id: 'reviewer-1', name: '李四-复核员', role: UserRole.REVIEWER },
  'supervisor-1': { id: 'supervisor-1', name: '王五-主管', role: UserRole.SUPERVISOR },
  'readonly-1': { id: 'readonly-1', name: '赵六-只读用户', role: UserRole.READ_ONLY }
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID' });
  }

  const user = mockUsers[userId];
  if (!user) {
    return res.status(401).json({ error: 'Invalid user ID' });
  }

  req.user = user;
  next();
}

export function requirePermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(req.user.role, action)) {
      return res.status(403).json({ 
        error: 'Permission denied',
        requiredAction: action,
        userRole: req.user.role 
      });
    }

    next();
  };
}

export function filterFieldsByRole<T extends object>(
  data: T,
  role: UserRole
): Partial<T> {
  const permissions = getRolePermissions(role);
  const result: Partial<T> = {};

  for (const field of permissions.visibleFields) {
    if (field in data) {
      (result as any)[field] = (data as any)[field];
    }
  }

  return result;
}

export function filterListByRole<T extends object>(
  items: T[],
  role: UserRole
): Array<Partial<T>> {
  return items.map(item => filterFieldsByRole(item, role));
}
