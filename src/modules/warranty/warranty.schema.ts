import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum WarrantyStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  VOIDED = 'VOIDED',
  CLAIM_PENDING = 'CLAIM_PENDING',
}

export enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
}

@Schema({ _id: false, timestamps: true })
export class WarrantyClaim {
  _id?: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ required: true, enum: Object.values(ClaimStatus), default: ClaimStatus.PENDING })
  status!: ClaimStatus;

  @Prop({ trim: true })
  resolution?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WarrantyClaimSchema = SchemaFactory.createForClass(WarrantyClaim);

@Schema({
  collection: 'warranties',
  timestamps: true,
})
export class Warranty extends Document {
  @Prop({ required: true, unique: true, trim: true, index: true })
  serialNumber!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order' })
  orderId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Dealer' })
  dealerId?: string;

  @Prop({ required: true })
  purchaseDate!: Date;

  @Prop({ required: true, min: 1 })
  warrantyPeriodYears!: number;

  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop({ required: true, enum: Object.values(WarrantyStatus), default: WarrantyStatus.ACTIVE, index: true })
  status!: WarrantyStatus;

  @Prop({ type: [WarrantyClaimSchema], default: [] })
  claims!: WarrantyClaim[];

  @Prop({ default: false })
  expiryNotified!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WarrantySchema = SchemaFactory.createForClass(Warranty);
