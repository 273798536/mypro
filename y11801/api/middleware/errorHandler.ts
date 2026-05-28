import { type Request, type Response, type NextFunction } from 'express';
import type { ApiResponse } from '../../shared/types/index.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.path}:`, error);

  let statusCode = 500;
  let message = '服务器内部错误';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = '禁止访问';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源不存在';
  }

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.message = error.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: `API 不存在: ${req.method} ${req.path}`,
  };
  res.status(404).json(response);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default { errorHandler, notFoundHandler, asyncHandler, AppError };
