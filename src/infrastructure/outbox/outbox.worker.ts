import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxRepository } from './outbox.repository';
import { OutboxEventDocument } from './outbox.schema';

/**
 * OutboxWorker — polls the outbox_events collection and emits
 * pending events in-memory via NestJS EventEmitter2.
 *
 * Architecture guarantees:
 * 1. Events are saved atomically with domain data (same Mongo session)
 * 2. Worker retries on failure up to maxRetries
 * 3. Events are marked PROCESSING before emitting to prevent duplicate delivery
 * 4. Emitted events are marked PUBLISHED and cleaned up by TTL index
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    this.pollIntervalMs = this.config.get<number>('outbox.pollIntervalMs', 5000);
    this.batchSize = this.config.get<number>('outbox.batchSize', 50);
    this.maxRetries = this.config.get<number>('outbox.maxRetries', 5);
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
    try {
      await this.eventEmitter.emitAsync(event.eventType, {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: new Date().toISOString(),
      });

      await this.outboxRepository.markPublished(event._id.toString());
      this.logger.debug(
        `Emitted in-memory event: ${event.eventType} [${event.aggregateId}]`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to emit event ${event._id}: ${errorMessage}`,
      );
      await this.outboxRepository.markFailed(
        event._id.toString(),
        errorMessage,
        this.maxRetries,
      );
    }
  }
}
