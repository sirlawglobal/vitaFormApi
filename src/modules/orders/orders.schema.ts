import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus, PaymentStatus } from './enums/order-status.enum';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderLineItem {
  @Prop({ required: true, trim: true })
  sku!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ trim: true })
  primaryImage?: string;

  @Prop({ type: Object })
  options?: Record<string, any>;
}

export const OrderLineItemSchema = SchemaFactory.createForClass(OrderLineItem);

@Schema({ _id: false })
export class OrderStatusHistory {
  @Prop({ required: true, enum: OrderStatus })
  status!: OrderStatus;

  @Prop({ required: true, default: () => new Date().toISOString() })
  changedAt!: string;

  @Prop({ trim: true })
  changedBy?: string;

  @Prop({ trim: true })
  note?: string;
}

export const OrderStatusHistorySchema = SchemaFactory.createForClass(OrderStatusHistory);

@Schema({ _id: false })
export class OrderPaymentSummary {
  @Prop({ required: true, min: 0 })
  subTotal!: number;

  @Prop({ required: true, min: 0, default: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0, default: 0 })
  taxAmount!: number;

  @Prop({ required: true, min: 0, default: 0 })
  shippingFee!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ required: true, trim: true })
  paymentMethod!: string;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @Prop({ trim: true })
  paymentReference?: string;
}

export const OrderPaymentSummarySchema = SchemaFactory.createForClass(OrderPaymentSummary);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true, index: true, trim: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: [OrderLineItemSchema], required: true })
  items!: OrderLineItem[];

  @Prop({ type: Object, required: true })
  shippingAddress!: Record<string, any>;

  @Prop({ type: Object })
  billingAddress?: Record<string, any>;

  @Prop({ type: OrderPaymentSummarySchema, required: true })
  paymentSummary!: OrderPaymentSummary;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  orderStatus!: OrderStatus;

  @Prop({ type: [OrderStatusHistorySchema], default: [] })
  statusHistory!: OrderStatusHistory[];

  @Prop({ trim: true })
  trackingNumber?: string;

  @Prop({ trim: true })
  courierName?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  checkoutRef?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
