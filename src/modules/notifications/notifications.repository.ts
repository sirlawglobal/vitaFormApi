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
    return this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { isRead: true },
        { new: true },
      )
      .exec();
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.notificationModel
      .updateMany({ userId: new Types.ObjectId(userId), isRead: false }, { isRead: true })
      .exec();
    return result.modifiedCount;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel
      .deleteOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    return result.deletedCount === 1;
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId: new Types.ObjectId(userId), isRead: false }).exec();
  }
}
