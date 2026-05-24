import { Request, Response, NextFunction } from 'express';
import { Operator } from '../types';

declare global {
  namespace Express {
    interface Request {
      operator?: Operator;
    }
  }
}

export const operatorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const operatorId = req.headers['x-operator-id'] as string;
  const operatorName = req.headers['x-operator-name'] as string;
  const operatorRole = (req.headers['x-operator-role'] as string) || 'user';

  if (!operatorId || !operatorName) {
    res.status(401).json({
      success: false,
      error: 'Missing operator information headers',
      code: 'MISSING_OPERATOR',
    });
    return;
  }

  req.operator = {
    id: operatorId,
    name: operatorName,
    role: operatorRole,
  };

  next();
};

export const getOperatorFromRequest = (req: Request): Operator => {
  if (!req.operator) {
    throw new Error('Operator not found in request');
  }
  return req.operator;
};

export default operatorMiddleware;
