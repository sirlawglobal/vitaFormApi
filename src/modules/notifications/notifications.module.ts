import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailWorker } from './email.worker';
import { SmsWorker } from './sms.worker';
import { PushWorker } from './push.worker';
import { Notification, NotificationSchema } from './notifications.schema';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsController } from './notifications.controller';
import { UsersModule } from '../users/users.module';

/**
 * NotificationsModule initializes the BullMQ consumers (EmailWorker, SmsWorker, PushWorker)
 * and the domain layer for in-app notifications.
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    UsersModule, // For fetching fcmToken
  ],
  controllers: [NotificationsController],
  providers: [
    EmailWorker,
    SmsWorker,
    PushWorker,
    NotificationsRepository,
    NotificationsService,
    NotificationsListener,
  ],
  exports: [EmailWorker, SmsWorker, PushWorker, NotificationsService],
})
export class NotificationsModule {}
