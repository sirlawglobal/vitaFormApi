import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { generateCorrelationId } from '../utils/token.util';

declare module 'express' {
  interface Request {
    correlationId: string;
  }
}

/**
 * Injects a correlation ID into every request.
 * Uses the incoming X-Correlation-ID header if present (for distributed tracing),
 * otherwise generates a new one. The ID is returned in the response header.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? generateCorrelationId();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  }
}
