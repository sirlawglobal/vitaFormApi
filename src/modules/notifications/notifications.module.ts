import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailWorker } from './email.worker';
import { SmsWorker } from './sms.worker';

/**
 * NotificationsModule initializes the BullMQ consumers (EmailWorker, SmsWorker)
 * so that queued verification codes (OTPs) and transactional messages are
 * processed immediately upon registration or password reset.
 */
@Module({
  imports: [ConfigModule],
  providers: [EmailWorker, SmsWorker],
  exports: [EmailWorker, SmsWorker],
})
export class NotificationsModule {}
