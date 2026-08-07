import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsRepository } from './notifications.repository';
import { Notification, NotificationType } from './notifications.schema';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';
import { UsersRepository } from '../users/users.repository';
import { AdminRepository } from '../admin/admin.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly queueService: QueueService,
    private readonly usersRepository: UsersRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async send(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<Notification> {
    // 1. Create MongoDB record
    const notification = await this.notificationsRepository.create({
      userId,
      type,
      title,
      body,
      data,
    });

    // 2. Fetch user to get FCM tokens
    const user = await this.usersRepository.findById(userId);
    if (user && user.preferences?.pushNotifications !== false && user.devices?.length > 0) {
      const fcmTokens = user.devices
        .map((d) => d.fcmToken)
        .filter((token): token is string => !!token);

      if (fcmTokens.length > 0) {
        // 3. Enqueue push job
        await this.queueService.add(QUEUE_NAMES.NOTIFICATION, JOB_NAMES.SEND_PUSH, {
          userId,
          fcmToken: fcmTokens,
          title,
          body,
          data,
        });
      }
    }

    return notification;
  }

  async broadcast(
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ sentCount: number }> {
    const allActiveUsers = await this.usersRepository.findAllActiveUsersForNotifications();
    if (allActiveUsers.length === 0) {
      return { sentCount: 0 };
    }

    const notificationDocs = allActiveUsers.map((user) => ({
      userId: new Types.ObjectId(user._id.toString()),
      type,
      title,
      body,
      data,
    }));

    // 1. Bulk insert in-app notifications
    await this.notificationsRepository.insertMany(notificationDocs as any);

    // 2. Queue push notifications
    let pushSentCount = 0;
    for (const user of allActiveUsers) {
      if (user.preferences?.pushNotifications !== false) {
        const fcmTokens = user.devices
          ?.map((d) => d.fcmToken)
          .filter((token): token is string => !!token);

        if (fcmTokens && fcmTokens.length > 0) {
          await this.queueService.add(QUEUE_NAMES.NOTIFICATION, JOB_NAMES.SEND_PUSH, {
            userId: user._id.toString(),
            fcmToken: fcmTokens,
            title,
            body,
            data,
          });
          pushSentCount++;
        }
      }
    }

    this.logger.log(`Broadcasted '${title}' to ${allActiveUsers.length} users (${pushSentCount} push targets)`);
    return { sentCount: allActiveUsers.length };
  }

  async listForUser(userId: string, page: number, limit: number): Promise<{ data: Notification[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await this.notificationsRepository.findByUser(userId, skip, limit);
    return { data, total };
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    return this.notificationsRepository.markRead(id, userId);
  }

  async markAllRead(userId: string): Promise<number> {
    return this.notificationsRepository.markAllRead(userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.notificationsRepository.delete(id, userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.countUnread(userId);
  }

  async sendWelcomeAndRecentNotifications(userId: string): Promise<void> {
    const settings = await this.adminRepository.getSettings();
    const title = settings.welcomeNotificationTitle || 'Welcome to Vitafoam!';
    const body = settings.welcomeNotificationBody || 'Your account has been successfully verified. Enjoy shopping with us!';

    // 1. Send Welcome Notification
    await this.send(
      userId,
      NotificationType.SYSTEM,
      title,
      body
    );

    // 2. Fetch the 3 most recent distinct notifications
    const recentNotifications = await this.notificationsRepository.findRecentDistinctNotifications(3);

    if (recentNotifications.length > 0) {
      // 3. Clone them for the new user
      const clonedDocs = recentNotifications.map((notif) => ({
        userId: new Types.ObjectId(userId),
        type: notif.type,
        title: notif.title,
        body: notif.body,
        data: notif.data,
        isRead: false,
      }));

      // 4. Insert them
      await this.notificationsRepository.insertMany(clonedDocs as any);
    }
  }
}
