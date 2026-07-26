import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus } from '../orders/enums/order-status.enum';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ required: true, unique: true, index: true, trim: true })
  paymentRef!: string;

  @Prop({ required: true, index: true, trim: true })
  checkoutRef!: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  provider!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, default: 'NGN', trim: true })
  currency!: string;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING, index: true })
  status!: PaymentStatus;

  @Prop({ trim: true })
  authorizationUrl?: string;

  @Prop({ trim: true })
  gatewayReference?: string;

  @Prop({ type: Object })
  rawGatewayResponse?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ userId: 1, createdAt: -1 });
