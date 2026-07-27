import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({
    required: true,
    enum: Object.values(DiscountType),
    default: DiscountType.PERCENTAGE,
  })
  discountType!: DiscountType;

  @Prop({ required: true, min: 0 })
  discountValue!: number; // Percentage e.g. 10 for 10%, or fixed amount e.g. 5000 NGN

  @Prop({ default: 0 })
  minOrderAmount!: number;

  @Prop({ default: 0 })
  maxDiscountAmount!: number; // Maximum NGN cap for percentage discounts

  @Prop({ default: 0 })
  usageLimitTotal!: number; // 0 = unlimited

  @Prop({ default: 1 })
  usageLimitPerUser!: number;

  @Prop({ default: 0 })
  usedCount!: number;

  @Prop({ type: [String], default: [] })
  applicableCategoryIds!: string[];

  @Prop({ type: [String], default: [] })
  applicableProductIds!: string[]; // Empty = Global coupon applies to all products

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ trim: true })
  description?: string;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
CouponSchema.index({ code: 1, isActive: 1 });
