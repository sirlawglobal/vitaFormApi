import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  PROMO = 'PROMO',
  SYSTEM = 'SYSTEM',
  REVIEW = 'REVIEW',
}

@Schema({
  collection: 'notifications',
  timestamps: true,
})
export class Notification extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: string;

  @Prop({ required: true, enum: Object.values(NotificationType) })
  type!: NotificationType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data?: Record<string, any>;

  @Prop({ default: false, index: true })
  isRead!: boolean;

  @Prop({ default: Date.now, expires: 7776000 }) // 90 days TTL
  createdAt!: Date;
  
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
