import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, path, ip, headers } = request;
    const startTime = Date.now();
    const userId = headers['x-user-id'] as string || 'anonymous';
    const userName = headers['x-user-name'] as string || 'anonymous';

    const auditData = {
      method,
      path,
      ip,
      userId,
      userName,
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`Request started: ${JSON.stringify(auditData)}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `Request completed: ${method} ${path} - ${duration}ms - User: ${userName}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `Request failed: ${method} ${path} - ${duration}ms - Error: ${error.message} - User: ${userName}`,
            error.stack,
          );
        },
      }),
    );
  }
}
