import { type Request, type Response, type NextFunction } from 'express';
import db from '../db/index.js';

interface ParsedResource {
  resourceType: string;
  resourceId: string;
}

function parseResourceFromPath(path: string): ParsedResource {
  const parts = path.split('/').filter(Boolean);
  const apiIndex = parts.indexOf('api');
  if (apiIndex !== -1 && parts.length > apiIndex + 1) {
    const resourceType = parts[apiIndex + 1] || 'unknown';
    const resourceId = parts[apiIndex + 2] || '';
    return { resourceType, resourceId };
  }
  return { resourceType: 'unknown', resourceId: '' };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
}

const insertLogStmt = db.prepare(`
  INSERT INTO action_log (
    id, trace_id, operator_id, operator_name, action,
    resource_type, resource_id, before_state, after_state,
    ip, user_agent, timestamp
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export default function actionLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method;
  if (!['POST', 'PUT', 'DELETE'].includes(method)) {
    next();
    return;
  }

  const { resourceType, resourceId } = parseResourceFromPath(req.path);
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const beforeState = res.locals.beforeState
    ? JSON.stringify(res.locals.beforeState)
    : null;

  const originalSend = res.send.bind(res);
  res.send = function (body: unknown): Response {
    let afterState: string | null = null;
    if (method === 'POST' || method === 'PUT') {
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          if (parsed.data) {
            afterState = JSON.stringify(parsed.data);
          } else if (parsed.success) {
            afterState = JSON.stringify(req.body);
          }
        } catch {
          afterState = JSON.stringify(req.body);
        }
      } else {
        afterState = JSON.stringify(req.body);
      }
    }

    if (res.statusCode < 400 && req.operator) {
      try {
        insertLogStmt.run(
          generateId(),
          req.traceId,
          req.operator.id,
          req.operator.name,
          method,
          resourceType,
          resourceId,
          beforeState,
          afterState,
          ip,
          userAgent,
          new Date().toISOString(),
        );
      } catch (err) {
        console.error('Failed to insert action log:', err);
      }
    }

    return originalSend(body);
  };

  next();
}
