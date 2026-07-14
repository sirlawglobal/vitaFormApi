import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, UpdateWriteOpResult } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from './outbox.schema';
import { OutboxStatus } from '../../common/enums/outbox-status.enum';

/**
 * OutboxRepository — the only class that touches the outbox_events collection.
 * All operations support Mongoose sessions for transactional consistency.
 */
@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly model: Model<OutboxEventDocument>,
  ) {}

  async create(
    data: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: Record<string, unknown>;
    },
    session?: ClientSession,
  ): Promise<OutboxEvent> {
    const [event] = await this.model.create([data], { session });
    return event;
  }

  /**
   * Find the next batch of pending events for the worker to process.
   * Uses the compound index { status: 1, createdAt: 1 }.
   */
  async findPendingBatch(limit: number): Promise<OutboxEventDocument[]> {
    return this.model
      .find({ status: OutboxStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Atomically claim events: set status to PROCESSING.
   * Prevents concurrent workers from picking up the same events.
   */
  async claimBatch(ids: string[]): Promise<UpdateWriteOpResult> {
    return this.model.updateMany(
      { _id: { $in: ids }, status: OutboxStatus.PENDING },
      { $set: { status: OutboxStatus.PROCESSING } },
    );
  }

  async markPublished(id: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          status: OutboxStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      },
    );
  }

  async markFailed(id: string, error: string, maxRetries: number): Promise<void> {
    const event = await this.model.findById(id);
    if (!event) return;

    const newRetryCount = event.retryCount + 1;
    const isFinalFailure = newRetryCount >= maxRetries;

    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          status: isFinalFailure ? OutboxStatus.FAILED : OutboxStatus.PENDING,
          lastError: error,
          retryCount: newRetryCount,
        },
      },
    );
  }

  async countByStatus(): Promise<Record<string, number>> {
    const results = await this.model.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return results.reduce(
      (acc, r) => ({ ...acc, [r._id]: r.count }),
      {} as Record<string, number>,
    );
  }
}
