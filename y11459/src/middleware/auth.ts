import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../utils/dataMasking';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: UserRole;
    cityCode?: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  const userName = req.headers['x-user-name'] as string;
  const userRole = req.headers['x-user-role'] as UserRole;
  const cityCode = req.headers['x-city-code'] as string;

  if (!userId || !userName || !userRole) {
    return res.status(401).json({
      success: false,
      message: '缺少用户身份信息',
    });
  }

  req.user = {
    id: userId,
    name: userName,
    role: userRole,
    cityCode,
  };

  next();
}
