import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: false, _id: false })
export class WishlistItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId!: string;

  @Prop({ default: Date.now })
  addedAt!: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

@Schema({
  collection: 'wishlists',
  timestamps: true,
})
export class Wishlist extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items!: WishlistItem[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
