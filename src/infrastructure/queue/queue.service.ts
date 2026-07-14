import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job, JobsOptions } from 'bullmq';
import { QUEUE_NAMES, QueueName } from '../../common/constants/queue-names.constants';

interface BulkJob {
  name: string;
  data: unknown;
  opts?: JobsOptions;
}

/**
 * QueueService provides a typed facade over BullMQ queues.
 * Modules add jobs here — they never instantiate Queue directly.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues: Map<QueueName, Queue> = new Map();

  constructor(private readonly config: ConfigService) {
    this.initQueues();
  }

  private initQueues(): void {
    const connection = {
      host: this.config.get<string>('redis.bull.host', 'localhost'),
      port: this.config.get<number>('redis.bull.port', 6379),
      password: this.config.get<string>('redis.bull.password'),
      db: this.config.get<number>('redis.bull.db', 1),
      tls: this.config.get<Record<string, unknown> | undefined>('redis.bull.tls'),
    };

    for (const queueName of Object.values(QUEUE_NAMES)) {
      const queue = new Queue(queueName, {
        connection,
        defaultJobOptions: {
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      });
      this.queues.set(queueName as QueueName, queue);
    }
    this.logger.log(`Initialized ${this.queues.size} BullMQ queues`);
  }

  private getQueue(queueName: QueueName): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue '${queueName}' not found`);
    return queue;
  }

  async add<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, opts);
    this.logger.debug(`Job '${jobName}' added to queue '${queueName}'`);
    return job as Job<T>;
  }

  async addBulk(queueName: QueueName, jobs: BulkJob[]): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return queue.addBulk(jobs) as Promise<Job[]>;
  }

  async getJobCounts(queueName: QueueName): Promise<Record<string, number>> {
    const queue = this.getQueue(queueName);
    return queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );
  }

  async closeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}
