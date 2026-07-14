import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Wraps all successful controller responses in the standard API envelope:
 * { success: true, data: <payload>, error: null, correlationId, timestamp }
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, unknown>
{
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { correlationId?: string }>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        error: null,
        correlationId: request.correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
