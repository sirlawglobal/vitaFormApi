import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({
  collection: 'reviews',
  timestamps: true,
})
export class Review extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  orderId!: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ required: true, enum: Object.values(ReviewStatus), default: ReviewStatus.PENDING, index: true })
  status!: ReviewStatus;

  @Prop({ default: 0 })
  helpfulCount!: number;

  @Prop({ trim: true })
  adminNote?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Ensure one review per product per user
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
