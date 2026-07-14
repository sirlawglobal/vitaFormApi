import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { OutboxRepository } from './outbox.repository';

export interface SaveOutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * OutboxService — the ONLY way domain services publish events.
 *
 * Usage pattern (within a MongoDB session):
 *   const session = await this.connection.startSession();
 *   session.startTransaction();
 *   try {
 *     await this.orderRepo.save(order, session);
 *     await this.outboxService.saveEvent({ ... }, session);
 *     await session.commitTransaction();
 *   } catch {
 *     await session.abortTransaction();
 *   } finally {
 *     session.endSession();
 *   }
 */
@Injectable()
export class OutboxService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async saveEvent(
    input: SaveOutboxEventInput,
    session?: ClientSession,
  ): Promise<void> {
    await this.outboxRepository.create(
      {
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
      },
      session,
    );
  }
}
