import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TicketCategory {
  DELIVERY_ISSUES = 'DELIVERY_ISSUES',
  PAYMENT_ISSUES = 'PAYMENT_ISSUES',
  PRODUCT_QUESTIONS = 'PRODUCT_QUESTIONS',
  WARRANTY = 'WARRANTY',
  RETURNS = 'RETURNS',
  REFUNDS = 'REFUNDS',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
  COMPLAINT = 'COMPLAINT',
  FEEDBACK = 'FEEDBACK',
}

export enum ConversationStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  CLOSED = 'CLOSED',
}

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedAgentId: Types.ObjectId | null;

  @Prop({ required: true, enum: TicketCategory })
  category: TicketCategory;

  @Prop({ required: true })
  subject: string;

  @Prop({ enum: ConversationStatus, default: ConversationStatus.OPEN })
  status: ConversationStatus;

  @Prop({ min: 1, max: 5 })
  rating?: number;

  @Prop()
  ratingComment?: string;

  @Prop()
  ratedAt?: Date;

  @Prop({ default: Date.now })
  lastMessageAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
