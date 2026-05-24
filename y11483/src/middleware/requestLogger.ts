import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  ApiRequestLog,
  RequestMethod,
  ResponseStatus,
} from '../entities';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      requestTime: Date;
      operator?: string;
    }
  }
}

const logRepository = AppDataSource.getRepository(ApiRequestLog);

export async function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = uuidv4();
  const requestTime = new Date();

  req.requestId = requestId;
  req.requestTime = requestTime;
  req.operator = req.headers['x-operator'] as string || 'system';

  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;

  res.json = function (body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.send = function (body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', async () => {
    try {
      const responseTime = new Date();
      const durationMs = responseTime.getTime() - requestTime.getTime();

      const status =
        res.statusCode >= 200 && res.statusCode < 300
          ? ResponseStatus.SUCCESS
          : res.statusCode >= 400
          ? ResponseStatus.ERROR
          : ResponseStatus.PARTIAL;

      const log = logRepository.create({
        requestId,
        method: req.method as RequestMethod,
        url: req.originalUrl,
        endpoint: req.path,
        status,
        httpStatusCode: res.statusCode,
        operator: req.operator,
        requestTime,
        responseTime,
        durationMs,
        requestHeaders: req.headers,
        requestBody: req.body,
        responseBody: typeof responseBody === 'object' ? responseBody : { data: String(responseBody) },
        errorMessage:
          status === ResponseStatus.ERROR && responseBody?.message
            ? responseBody.message
            : null,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        batchNo: req.body?.batchNo || req.query?.batchNo,
        traceNo: req.body?.traceNo || req.query?.traceNo,
        createdBy: req.operator,
        updatedBy: req.operator,
      });

      await logRepository.save(log);
    } catch (error) {
      console.error('Failed to save request log:', error);
    }
  });

  next();
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[${req.requestId}] Error:`, err);
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}