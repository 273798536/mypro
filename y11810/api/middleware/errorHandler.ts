import { type Request, type Response, type NextFunction } from 'express';

interface HttpError extends Error {
  statusCode?: number;
}

export default function errorHandlerMiddleware(
  error: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const traceId = req.traceId || 'unknown';
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Server internal error' : error.message;

  console.error(`[${traceId}] Error:`, error);

  res.status(statusCode).json({
    success: false,
    error: message,
    traceId,
  });
}
