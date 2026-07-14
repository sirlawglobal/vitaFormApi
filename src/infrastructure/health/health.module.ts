import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq.health';
import { CacheModule } from '../cache/cache.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [TerminusModule, CacheModule, MessagingModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, RabbitMQHealthIndicator],
})
export class HealthModule {}
