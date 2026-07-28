import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { Notification, NotificationType } from './notifications.schema';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly queueService: QueueService,
    private readonly usersRepository: UsersRepository,
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
}
