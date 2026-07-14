import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxRepository } from './outbox.repository';
import { MessagingService } from '../messaging/messaging.service';
import { OutboxEventDocument } from './outbox.schema';
import { ROUTING_KEYS } from '../../common/constants/exchange-names.constants';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';

/**
 * OutboxWorker — polls the outbox_events collection and publishes
 * pending events to RabbitMQ.
 *
 * Architecture guarantees:
 * 1. Events are saved atomically with domain data (same Mongo session)
 * 2. Worker retries on failure up to maxRetries
 * 3. Events are marked PROCESSING before publish to prevent duplicate delivery
 * 4. Published events are marked PUBLISHED and cleaned up by TTL index
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  /** Map domain event names to RabbitMQ routing keys */
  private readonly eventToRoutingKey: Record<string, string> = {
    [DOMAIN_EVENTS.ORDER_CREATED]: ROUTING_KEYS.ORDER_CREATED,
    [DOMAIN_EVENTS.ORDER_CONFIRMED]: ROUTING_KEYS.ORDER_CONFIRMED,
    [DOMAIN_EVENTS.ORDER_SHIPPED]: ROUTING_KEYS.ORDER_SHIPPED,
    [DOMAIN_EVENTS.ORDER_DELIVERED]: ROUTING_KEYS.ORDER_DELIVERED,
    [DOMAIN_EVENTS.ORDER_CANCELLED]: ROUTING_KEYS.ORDER_CANCELLED,
    [DOMAIN_EVENTS.PAYMENT_COMPLETED]: ROUTING_KEYS.PAYMENT_COMPLETED,
    [DOMAIN_EVENTS.PAYMENT_FAILED]: ROUTING_KEYS.PAYMENT_FAILED,
    [DOMAIN_EVENTS.USER_REGISTERED]: ROUTING_KEYS.USER_REGISTERED,
    [DOMAIN_EVENTS.USER_VERIFIED]: ROUTING_KEYS.USER_VERIFIED,
    [DOMAIN_EVENTS.PRODUCT_CREATED]: ROUTING_KEYS.PRODUCT_CREATED,
    [DOMAIN_EVENTS.PRODUCT_UPDATED]: ROUTING_KEYS.PRODUCT_UPDATED,
    [DOMAIN_EVENTS.PRODUCT_DELETED]: ROUTING_KEYS.PRODUCT_DELETED,
    [DOMAIN_EVENTS.STOCK_DEPLETED]: ROUTING_KEYS.STOCK_DEPLETED,
    [DOMAIN_EVENTS.REVIEW_SUBMITTED]: ROUTING_KEYS.REVIEW_SUBMITTED,
    [DOMAIN_EVENTS.WARRANTY_REGISTERED]: ROUTING_KEYS.WARRANTY_REGISTERED,
    [DOMAIN_EVENTS.WARRANTY_EXPIRING]: ROUTING_KEYS.WARRANTY_EXPIRING,
    [DOMAIN_EVENTS.RECOMMENDATION_REQUESTED]:
      ROUTING_KEYS.RECOMMENDATION_REQUESTED,
  };

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly messagingService: MessagingService,
    private readonly config: ConfigService,
  ) {
    this.pollIntervalMs = this.config.get<number>(
      'rabbitmq.outbox.pollIntervalMs',
      5000,
    );
    this.batchSize = this.config.get<number>('rabbitmq.outbox.batchSize', 50);
    this.maxRetries = this.config.get<number>('rabbitmq.outbox.maxRetries', 5);
  }

  onModuleInit(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  private start(): void {
    this.logger.log(
      `OutboxWorker started — polling every ${this.pollIntervalMs}ms, batch=${this.batchSize}`,
    );
    this.timer = setInterval(() => this.processEvents(), this.pollIntervalMs);
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('OutboxWorker stopped');
  }

  private async processEvents(): Promise<void> {
    if (this.isRunning) return; // Prevent overlapping runs
    this.isRunning = true;

    try {
      const events = await this.outboxRepository.findPendingBatch(this.batchSize);
      if (events.length === 0) return;

      // Atomically claim batch to prevent duplicate processing
      const ids = events.map((e) => e._id.toString());
      await this.outboxRepository.claimBatch(ids);

      this.logger.debug(`Processing ${events.length} outbox events`);

      // Process in parallel with individual error handling
      await Promise.allSettled(
        events.map((event) => this.publishEvent(event)),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `OutboxWorker processEvents error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async publishEvent(event: OutboxEventDocument): Promise<void> {
    const routingKey = this.eventToRoutingKey[event.eventType];

    if (!routingKey) {
      this.logger.warn(
        `No routing key for event type: ${event.eventType} — marking as published`,
      );
      await this.outboxRepository.markPublished(event._id.toString());
      return;
    }

    try {
      const published = await this.messagingService.publish(routingKey, {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: new Date().toISOString(),
      });

      if (published) {
        await this.outboxRepository.markPublished(event._id.toString());
        this.logger.debug(
          `Published: ${event.eventType} [${event.aggregateId}] → ${routingKey}`,
        );
      } else {
        throw new Error('Channel returned false — back-pressure');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to publish event ${event._id}: ${errorMessage}`,
      );
      await this.outboxRepository.markFailed(
        event._id.toString(),
        errorMessage,
        this.maxRetries,
      );
    }
  }
}
