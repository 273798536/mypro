import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data &&
          'data' in data
        ) {
          return data as ApiResponse<unknown>;
        }

        return {
          code: 200,
          message: 'success',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
