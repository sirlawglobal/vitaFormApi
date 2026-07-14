import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof BusinessException) {
      statusCode = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        code = (bodyObj['error'] as string) ?? 'HTTP_ERROR';
        message = (bodyObj['message'] as string) ?? exception.message;
        if (Array.isArray(bodyObj['message'])) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = { errors: bodyObj['message'] };
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorBody = {
      success: false,
      data: null,
      error: { code, message, ...(details ? { details } : {}) },
      correlationId: request.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log 5xx errors
    if (statusCode >= 500) {
      this.logger.error(JSON.stringify(errorBody));
    }

    response.status(statusCode).json(errorBody);
  }
}
