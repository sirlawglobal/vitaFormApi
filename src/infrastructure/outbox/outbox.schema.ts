import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OutboxStatus } from '../../common/enums/outbox-status.enum';

export type OutboxEventDocument = OutboxEvent & Document;

@Schema({
  collection: 'outbox_events',
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  versionKey: false,
})
export class OutboxEvent {
  _id: Types.ObjectId;

  /**
   * The domain aggregate type, e.g. 'Order', 'User', 'Payment'.
   * Used by consumers to understand context.
   */
  @Prop({ required: true, index: true })
  aggregateType: string;

  /** The ID of the affected aggregate */
  @Prop({ required: true })
  aggregateId: string;

  /**
   * The domain event name, e.g. 'OrderCreated', 'PaymentCompleted'.
   * Maps to DOMAIN_EVENTS constants.
   */
  @Prop({ required: true })
  eventType: string;

  /** The full serialized event payload */
  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({
    type: String,
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
    index: true,
  })
  status: OutboxStatus;

  /** Number of publish attempts made */
  @Prop({ default: 0 })
  retryCount: number;

  /** Last error message if publish failed */
  @Prop()
  lastError?: string;

  @Prop()
  createdAt: Date;

  /** Timestamp when successfully published to RabbitMQ */
  @Prop()
  publishedAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

// ── Indexes ───────────────────────────────────────────────────────────────────

/** Primary worker polling index: find pending events in creation order */
OutboxEventSchema.index({ status: 1, createdAt: 1 });

/** For aggregate-level event querying */
OutboxEventSchema.index({ aggregateId: 1, eventType: 1 });

/**
 * TTL index: automatically purge published events after 7 days.
 * Only applies to documents with publishedAt set.
 */
OutboxEventSchema.index(
  { publishedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, sparse: true },
);
