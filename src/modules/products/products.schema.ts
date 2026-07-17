import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum Firmness {
  SOFT = 'soft',
  MEDIUM = 'medium',
  FIRM = 'firm',
  EXTRA_FIRM = 'extra-firm',
}

@Schema({ _id: false })
export class ProductDimensions {
  @Prop({ required: true })
  length!: number;

  @Prop({ required: true })
  width!: number;

  @Prop({ required: true })
  height!: number;

  @Prop({ required: true, default: 'cm' })
  unit?: string;
}

@Schema({ _id: false })
export class ProductWeight {
  @Prop({ required: true })
  value!: number;

  @Prop({ required: true, default: 'kg' })
  unit?: string;
}

@Schema({ timestamps: false })
export class ProductVariant {
  _id?: any;

  @Prop({ required: true, unique: true, index: true, trim: true })
  sku!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  price!: number;

  @Prop()
  compareAtPrice?: number;

  @Prop({ enum: Firmness })
  firmness?: Firmness;

  @Prop({ type: ProductDimensions })
  dimensions?: ProductDimensions;

  @Prop({ type: ProductWeight })
  weight?: ProductWeight;

  @Prop({ default: true })
  isAvailable?: boolean;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ _id: false })
export class ProductImage {
  @Prop({ required: true, trim: true })
  url!: string;

  @Prop({ trim: true })
  alt?: string;

  @Prop({ default: false })
  isPrimary?: boolean;
}

export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, index: true, trim: true, lowercase: true })
  categorySlug!: string;

  @Prop({ type: [String], default: [], index: true })
  tags!: string[];

  @Prop({ type: [ProductImageSchema], default: [] })
  images!: ProductImage[];

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants!: ProductVariant[];

  @Prop({ type: Map, of: String, default: {} })
  specifications!: Record<string, string>;

  @Prop({ trim: true })
  warrantyTerms?: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false, index: true })
  isFeatured!: boolean;

  @Prop({ default: 0, min: 0, max: 5 })
  rating!: number;

  @Prop({ default: 0, min: 0 })
  reviewCount!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Compound indexes for common query paths
ProductSchema.index({ categorySlug: 1, isActive: 1, isFeatured: 1 });
ProductSchema.index({ 'variants.price': 1, 'variants.firmness': 1 });
