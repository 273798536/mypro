import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('API Error:', err);

  const statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    error: err.message || '内部服务器错误',
    errorCode: err.name || 'UNKNOWN_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export const validateOperator = (req: Request, res: Response, next: NextFunction) => {
  const operatorId = req.headers['x-operator-id'];
  const operatorName = req.headers['x-operator-name'];
  
  if (!operatorId || !operatorName) {
    return res.status(400).json({
      success: false,
      error: '缺少操作人信息，请在请求头中设置 x-operator-id 和 x-operator-name'
    });
  }
  
  next();
};
