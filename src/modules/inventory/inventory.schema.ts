import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Inventory extends Document {
  @Prop({ required: true, unique: true, index: true, trim: true })
  sku!: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  quantity!: number;

  @Prop({ required: true, default: 0, min: 0 })
  reserved!: number;

  @Prop({ required: true, default: 10, min: 0 })
  reorderPoint!: number;

  @Prop({ required: true, default: 50, min: 1 })
  reorderQuantity!: number;

  @Prop({ required: true, default: 'Main Warehouse — Ikeja', trim: true })
  warehouse!: string;

  @Prop({ required: true, default: 1, min: 1 })
  version!: number;

  // Virtual computed balance
  available!: number;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);

// Virtual for available stock = quantity - reserved
InventorySchema.virtual('available').get(function (this: Inventory) {
  return Math.max(0, (this.quantity || 0) - (this.reserved || 0));
});

// Compound index for low stock scanning
InventorySchema.index({ quantity: 1, reserved: 1, reorderPoint: 1 });
