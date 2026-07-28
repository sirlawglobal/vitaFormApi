import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewStatus } from './reviews.schema';

@Injectable()
export class ReviewsRepository {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,
  ) {}

  async create(data: Partial<Review>): Promise<Review> {
    const review = new this.reviewModel(data);
    return review.save();
  }

  async findByProduct(productId: string, skip: number, limit: number): Promise<[Review[], number]> {
    const filter = { productId: new Types.ObjectId(productId), status: ReviewStatus.APPROVED };
    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return [items, total];
  }

  async findByUser(userId: string, skip: number, limit: number): Promise<[Review[], number]> {
    const filter = { userId: new Types.ObjectId(userId) };
    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('productId', 'name slug images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return [items, total];
  }

  async findByStatus(status: ReviewStatus, skip: number, limit: number): Promise<[Review[], number]> {
    const filter = { status };
    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('productId', 'name slug')
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return [items, total];
  }

  async findById(id: string): Promise<Review | null> {
    return this.reviewModel.findById(id).exec();
  }

  async updateStatus(id: string, status: ReviewStatus, adminNote?: string): Promise<Review | null> {
    return this.reviewModel
      .findByIdAndUpdate(
        id,
        { status, ...(adminNote && { adminNote }) },
        { new: true },
      )
      .exec();
  }

  async incrementHelpful(id: string): Promise<Review | null> {
    return this.reviewModel
      .findByIdAndUpdate(id, { $inc: { helpfulCount: 1 } }, { new: true })
      .exec();
  }

  async getRatingAggregation(productId: string) {
    const result = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId), status: ReviewStatus.APPROVED } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalCount: { $sum: 1 },
          1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    if (result.length === 0) {
      return { averageRating: 0, totalCount: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }

    const res = result[0];
    return {
      averageRating: Math.round(res.averageRating * 10) / 10,
      totalCount: res.totalCount,
      distribution: {
        1: res[1],
        2: res[2],
        3: res[3],
        4: res[4],
        5: res[5],
      },
    };
  }
}
