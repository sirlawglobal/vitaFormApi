import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist } from './wishlist.schema';

@Injectable()
export class WishlistRepository {
  constructor(
    @InjectModel(Wishlist.name)
    private readonly wishlistModel: Model<Wishlist>,
  ) {}

  async findOrCreate(userId: string): Promise<Wishlist> {
    return this.wishlistModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $setOnInsert: { userId: new Types.ObjectId(userId), items: [] } },
      { new: true, upsert: true },
    ).exec();
  }

  async getItems(userId: string): Promise<Wishlist | null> {
    return this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'items.productId',
        select: 'name slug images price variants',
      })
      .exec();
  }

  async addItem(userId: string, productId: string): Promise<Wishlist | null> {
    return this.wishlistModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { 
        $addToSet: { 
          items: { productId: new Types.ObjectId(productId), addedAt: new Date() } 
        } 
      },
      { new: true, upsert: true },
    ).exec();
  }

  async removeItem(userId: string, productId: string): Promise<Wishlist | null> {
    return this.wishlistModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { 
        $pull: { 
          items: { productId: new Types.ObjectId(productId) } 
        } 
      },
      { new: true },
    ).exec();
  }
}
