import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class GeoJSONPoint {
  @Prop({ type: String, enum: ['Point'], required: true, default: 'Point' })
  type!: string;

  // [longitude, latitude] - MongoDB requires longitude first!
  @Prop({ type: [Number], required: true })
  coordinates!: number[];
}

@Schema({
  collection: 'dealers',
  timestamps: true,
})
export class Dealer extends Document {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ type: GeoJSONPoint, required: true, index: '2dsphere' })
  location!: GeoJSONPoint;

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ trim: true })
  contactEmail?: string;

  @Prop({ trim: true })
  operatingHours?: string;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const DealerSchema = SchemaFactory.createForClass(Dealer);
