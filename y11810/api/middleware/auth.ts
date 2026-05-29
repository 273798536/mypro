import { type Request, type Response, type NextFunction } from 'express';

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const operatorId = req.headers['x-operator-id'] as string;
  const operatorName = req.headers['x-operator-name'] as string;

  if (!operatorId || !operatorName) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  req.operator = {
    id: operatorId,
    name: operatorName,
  };

  next();
}
