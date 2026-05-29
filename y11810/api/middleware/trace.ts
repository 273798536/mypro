import { type Request, type Response, type NextFunction } from 'express';

function generateTraceId(): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `trace-${timestamp}-${randomStr}`;
}

export default function traceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);
  next();
}
