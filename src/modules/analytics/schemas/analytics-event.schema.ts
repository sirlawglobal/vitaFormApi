import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

export enum AnalyticsEventType {
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  ADD_TO_CART = 'ADD_TO_CART',
  CHECKOUT_START = 'CHECKOUT_START',
  PURCHASE = 'PURCHASE',
}

@Schema({ timestamps: true, collection: 'analytics_events' })
export class AnalyticsEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  userEmail?: string;

  @Prop({ trim: true })
  userPhone?: string;

  @Prop({ required: true, trim: true, index: true })
  sessionId!: string;

  @Prop({
    required: true,
    enum: Object.values(AnalyticsEventType),
    index: true,
  })
  eventType!: AnalyticsEventType;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Date, default: Date.now, expires: 7776000 }) // 90 days TTL
  createdAt!: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 });
AnalyticsEventSchema.index({ userId: 1, createdAt: -1 });
