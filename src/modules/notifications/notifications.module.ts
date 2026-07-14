import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailWorker } from './email.worker';
import { SmsWorker } from './sms.worker';
import { PushWorker } from './push.worker';

/**
 * NotificationsModule initializes the BullMQ consumers (EmailWorker, SmsWorker, PushWorker)
 * so that queued verification codes (OTPs), SMS alerts, and mobile push notifications
 * are processed immediately across all channels.
 */
@Module({
  imports: [ConfigModule],
  providers: [EmailWorker, SmsWorker, PushWorker],
  exports: [EmailWorker, SmsWorker, PushWorker],
})
export class NotificationsModule {}
