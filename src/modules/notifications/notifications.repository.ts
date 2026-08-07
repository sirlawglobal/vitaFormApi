import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './notifications.schema';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = new this.notificationModel(data);
    return notification.save();
  }

  async insertMany(data: Partial<Notification>[]): Promise<void> {
    if (!data || data.length === 0) return;
    await this.notificationModel.insertMany(data);
  }

  async findByUser(userId: string, skip: number, limit: number): Promise<[Notification[], number]> {
    const objectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const filter = { userId: { $in: [objectId, userId] } };
    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);
    return [items, total];
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const objectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    return this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: { $in: [objectId, userId] } },
        { isRead: true },
        { new: true },
      )
      .exec();
  }

  async markAllRead(userId: string): Promise<number> {
    const objectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const result = await this.notificationModel
      .updateMany({ userId: { $in: [objectId, userId] }, isRead: false }, { isRead: true })
      .exec();
    return result.modifiedCount;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const objectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    const result = await this.notificationModel
      .deleteOne({ _id: new Types.ObjectId(id), userId: { $in: [objectId, userId] } })
      .exec();
    return result.deletedCount === 1;
  }

  async countUnread(userId: string): Promise<number> {
    const objectId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId;
    return this.notificationModel.countDocuments({ userId: { $in: [objectId, userId] }, isRead: false }).exec();
  }

  async findRecentDistinctNotifications(limit: number): Promise<Partial<Notification>[]> {
    return this.notificationModel.aggregate([
      // Only include PROMO and SYSTEM as they are broadcast candidates
      { $match: { type: { $in: ['PROMO', 'SYSTEM'] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { title: '$title', body: '$body' },
          type: { $first: '$type' },
          title: { $first: '$title' },
          body: { $first: '$body' },
          data: { $first: '$data' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit }
    ]).exec();
  }
}
