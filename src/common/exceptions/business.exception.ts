import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constants';

export interface BusinessExceptionOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Base business exception — thrown for all domain-level errors.
 * Caught by GlobalExceptionFilter and formatted into standard error envelope.
 */
export class BusinessException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(options: BusinessExceptionOptions) {
    super(
      {
        code: options.code,
        message: options.message,
        details: options.details,
      },
      options.statusCode ?? HttpStatus.BAD_REQUEST,
    );
    this.code = options.code;
    this.details = options.details;
  }
}

export class NotFoundException extends BusinessException {
  constructor(code: ErrorCode, message: string) {
    super({ code, message, statusCode: HttpStatus.NOT_FOUND });
  }
}

export class ConflictException extends BusinessException {
  constructor(code: ErrorCode, message: string) {
    super({ code, message, statusCode: HttpStatus.CONFLICT });
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(code: ErrorCode, message: string) {
    super({ code, message, statusCode: HttpStatus.UNAUTHORIZED });
  }
}

export class ForbiddenException extends BusinessException {
  constructor(code: ErrorCode, message: string) {
    super({ code, message, statusCode: HttpStatus.FORBIDDEN });
  }
}

export class ValidationException extends BusinessException {
  constructor(details: Record<string, unknown>) {
    super({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}
