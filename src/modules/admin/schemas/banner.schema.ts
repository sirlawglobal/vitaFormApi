import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true, collection: 'banners' })
export class Banner {
  @Prop({ trim: true })
  title?: string;

  @Prop({ enum: ['custom', 'image_only'], default: 'custom' })
  bannerType!: 'custom' | 'image_only';

  @Prop({ required: true, trim: true })
  imageUrl!: string;

  @Prop({ trim: true })
  targetUrl?: string;

  @Prop({ default: 0, index: true })
  displayOrder!: number;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ trim: true })
  subtitle?: string;

  @Prop({ trim: true })
  buttonText?: string;

  @Prop()
  scheduledStartDate?: Date;

  @Prop()
  scheduledEndDate?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
BannerSchema.index({ isActive: 1, displayOrder: 1 });
