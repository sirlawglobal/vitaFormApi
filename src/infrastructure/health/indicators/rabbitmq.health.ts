import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { MessagingService } from '../../messaging/messaging.service';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  constructor(private readonly messagingService: MessagingService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const connected = this.messagingService.isConnected();
    if (connected) {
      return this.getStatus(key, true);
    }
    throw new HealthCheckError(
      'RabbitMQ health check failed',
      this.getStatus(key, false, { error: 'Not connected' }),
    );
  }
}
