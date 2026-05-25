import { Request, Response, NextFunction } from 'express';
import { AutoCheckService } from '../services/AutoCheckService';

export const requirePermission = (
  autoCheckService: AutoCheckService,
  action: string
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.headers['x-user-id'] as string || 'anonymous';
  const userRole = req.headers['x-user-role'] as string || 'operator';

  const check = await autoCheckService.checkPermissionInterceptor(
    userId,
    userRole,
    action,
    req.params.id
  );

  if (!check.allowed) {
    res.status(403).json({
      success: false,
      error: check.reason || '权限不足'
    });
    return;
  }

  next();
};

export const requireRole = (roles: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userRole = req.headers['x-user-role'] as string || 'operator';

  if (!roles.includes(userRole)) {
    res.status(403).json({
      success: false,
      error: `需要角色: ${roles.join(', ')}，当前角色: ${userRole}`
    });
    return;
  }

  next();
};
