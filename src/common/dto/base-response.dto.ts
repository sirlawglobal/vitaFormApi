import { ApiProperty } from '@nestjs/swagger';

/** Standard success response envelope */
export class ApiResponse<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: null })
  error: null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  correlationId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  constructor(data: T, correlationId: string) {
    this.success = true;
    this.data = data;
    this.error = null;
    this.correlationId = correlationId;
    this.timestamp = new Date().toISOString();
  }
}

/** Standard error response envelope */
export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: null })
  data: null;

  @ApiProperty()
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  correlationId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}
