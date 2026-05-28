import { type Request, type Response, type NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, path, ip, query, body } = req;

  console.log(`[Request] ${method} ${path} - IP: ${ip}`);

  if (Object.keys(query).length > 0) {
    console.log(`[Query] ${JSON.stringify(query)}`);
  }

  if (method !== 'GET' && Object.keys(body).length > 0) {
    const sanitizedBody = { ...body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    if (sanitizedBody.token) sanitizedBody.token = '***';
    console.log(`[Body] ${JSON.stringify(sanitizedBody)}`);
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    let logLevel = 'INFO';
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'WARN';
    } else if (statusCode >= 500) {
      logLevel = 'ERROR';
    }

    console.log(
      `[Response] [${logLevel}] ${method} ${path} - Status: ${statusCode} - Duration: ${duration}ms`
    );
  });

  next();
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

export default { logger, requestId };
