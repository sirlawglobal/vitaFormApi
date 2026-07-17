import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parentId?: Types.ObjectId | null;

  @Prop({ required: true, default: '/', index: true })
  path!: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ trim: true })
  imageUrl?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Compound index on path and order for fast hierarchy retrieval and sorting
CategorySchema.index({ path: 1, order: 1 });
