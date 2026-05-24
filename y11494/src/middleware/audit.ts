import { Request, Response, NextFunction } from 'express';
import { runQuery } from '../config/database';

export const auditLog = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      try {
        if (user) {
          let resourceId: number | undefined;
          if (req.params.id) {
            resourceId = parseInt(req.params.id);
          } else if (responseBody && typeof responseBody === 'string') {
            try {
              const parsed = JSON.parse(responseBody);
              if (parsed.id) resourceId = parsed.id;
              else if (parsed.data?.id) resourceId = parsed.data.id;
            } catch { }
          }
          const details = JSON.stringify({
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            requestBody: req.body ? maskSensitiveData(req.body) : undefined
          });
          await runQuery(
            'INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, ip, user_agent, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [user.userId, user.name, action, resourceType, resourceId || null, req.ip, req.get('user-agent'), details]
          );
        }
      } catch (error) {
        console.error('审计日志记录失败:', error);
      }
    });
    next();
  };
};

const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  const masked = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***';
    }
  }
  return masked;
};
