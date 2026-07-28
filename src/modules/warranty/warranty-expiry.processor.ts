import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';
import { WarrantyRepository } from './warranty.repository';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';

@Injectable()
export class WarrantyExpiryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WarrantyExpiryProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly warrantyRepository: WarrantyRepository,
    private readonly outboxService: OutboxService,
  ) { }

  onModuleInit(): void {
    const host = this.config.get<string>('redis.bull.host', 'localhost');
    const port = this.config.get<number>('redis.bull.port', 6379);
    const password = this.config.get<string>('redis.bull.password');
    const db = this.config.get<number>('redis.bull.db', 0);
    const tls = this.config.get<Record<string, unknown> | undefined>('redis.bull.tls');

    this.worker = new Worker(
      QUEUE_NAMES.WARRANTY,
      async (job: Job) => {
        if (job.name === JOB_NAMES.PROCESS_EXPIRING_WARRANTIES) {
          await this.processExpiringWarranties();
        }
      },
      {
        connection: { host, port, password, db, tls },
        concurrency: 1, // Ensures we don't process same job in parallel across multiple pods easily
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Job [${job.id}] (${job.name}) completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job [${job?.id}] (${job?.name}) failed: ${err.message}`, err.stack);
    });

    this.logger.log(`WarrantyExpiryProcessor started on '${QUEUE_NAMES.WARRANTY}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processExpiringWarranties(): Promise<void> {
    this.logger.log('Running daily expiry check for warranties...');

    // 1. Mark past-due warranties as EXPIRED
    const expiredCount = await this.warrantyRepository.markExpired();
    if (expiredCount > 0) {
      this.logger.log(`Marked ${expiredCount} warranties as EXPIRED.`);
    }

    // 2. Find warranties expiring in <= 30 days that haven't been notified yet
    const expiringSoon = await this.warrantyRepository.findExpiringWithin(30);

    if (expiringSoon.length === 0) {
      this.logger.debug('No new warranties expiring within 30 days.');
      return;
    }

    // 3. Emit Domain Events to outbox for notifications
    const notifiedIds: string[] = [];
    for (const warranty of expiringSoon) {
      await this.outboxService.saveEvent({
        aggregateType: 'Warranty',
        aggregateId: warranty._id.toString(),
        eventType: DOMAIN_EVENTS.WARRANTY_EXPIRING,
        payload: {
          warrantyId: warranty._id.toString(),
          userId: warranty.userId.toString(),
          expiresAt: warranty.expiresAt,
          productId: warranty.productId.toString(),
        },
      });
      notifiedIds.push(warranty._id.toString());
    }

    // 4. Mark as notified so we don't spam them tomorrow
    await this.warrantyRepository.markAsNotified(notifiedIds);
    this.logger.log(`Dispatched expiry notifications for ${notifiedIds.length} warranties.`);
  }
}
