import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SenderType {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
}

export enum FileType {
  IMAGE = 'IMAGE',
  RECEIPT = 'RECEIPT',
  WARRANTY_CARD = 'WARRANTY_CARD',
  DOCUMENT = 'DOCUMENT',
}

export interface Attachment {
  url: string;
  fileType: FileType;
  fileName: string;
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Conversation' })
  conversationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  senderId: Types.ObjectId;

  @Prop({ required: true, enum: SenderType })
  senderType: SenderType;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Array, default: [] })
  attachments: Attachment[];

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
