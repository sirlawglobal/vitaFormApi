import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';

/**
 * SmsWorker consumes jobs from the 'sms.queue' via BullMQ.
 * Dispatches verification OTPs and order status updates via SMS (Termii/Twilio).
 */
@Injectable()
export class SmsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsWorker.name);
  private worker!: Worker;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('redis.bull.host', 'localhost');
    const port = this.config.get<number>('redis.bull.port', 6379);
    const password = this.config.get<string>('redis.bull.password');
    const db = this.config.get<number>('redis.bull.db', 0);
    const tls = this.config.get<Record<string, unknown> | undefined>('redis.bull.tls');

    const connection = { host, port, password, db, tls };

    this.worker = new Worker(
      QUEUE_NAMES.SMS,
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 1,
        stalledInterval: 30000,
        maxStalledCount: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`SMS job [${job.id}] (${job.name}) completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`SMS job [${job?.id}] (${job?.name}) failed: ${err.message}`, err.stack);
    });

    this.logger.log(`SmsWorker started — listening on '${QUEUE_NAMES.SMS}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processJob(job: Job): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case JOB_NAMES.SEND_VERIFICATION_OTP:
      case JOB_NAMES.RESEND_OTP:
      case JOB_NAMES.SEND_OTP:
      case 'send-verification-otp':
      case 'resend-otp':
      case 'send-otp':
        if (data.type === 'password-reset') {
          await this.handlePasswordResetOtp(data);
        } else {
          await this.handleVerificationOtp(data);
        }
        break;
      case JOB_NAMES.SEND_PASSWORD_RESET_OTP:
      case 'send-password-reset-otp':
      case 'send-password-reset':
        await this.handlePasswordResetOtp(data);
        break;
      default:
        this.logger.warn(`Unknown SMS job type: ${name}`);
    }
  }

  private async handleVerificationOtp(data: { phone: string; otp: string }): Promise<void> {
    console.log(`\n============================================================`);
    console.log(`📱 [SMS WORKER DISPATCH] — Verification OTP`);
    console.log(`To Phone: ${data.phone}`);
    console.log(`Message:  Your Vitafoam verification code is [ ${data.otp} ]. Valid for 5 mins.`);
    console.log(`============================================================\n`);

    const termiiApiKey = process.env.TERMII_API_KEY;
    if (termiiApiKey) {
      try {
        const response = await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.phone,
            from: process.env.TERMII_SENDER_ID || 'Vitafoam',
            sms: `Your Vitafoam verification code is ${data.otp}. Valid for 5 mins. Do not share.`,
            type: 'plain',
            channel: 'dnd',
            api_key: termiiApiKey,
          }),
        });
        const result = await response.json();
        if (response.ok) {
          this.logger.log(`Termii SMS verification dispatched to ${data.phone}`);
        } else {
          this.logger.error(`Termii SMS API error: ${JSON.stringify(result)}`);
        }
      } catch (err: any) {
        this.logger.error(`Failed to send SMS via Termii: ${err.message}`);
      }
    }
  }

  private async handlePasswordResetOtp(data: { phone: string; otp: string }): Promise<void> {
    console.log(`\n============================================================`);
    console.log(`📱 [SMS WORKER DISPATCH] — Password Reset OTP`);
    console.log(`To Phone: ${data.phone}`);
    console.log(`Message:  Vitafoam password reset code is [ ${data.otp} ]. Valid for 5 mins.`);
    console.log(`============================================================\n`);

    const termiiApiKey = process.env.TERMII_API_KEY;
    if (termiiApiKey) {
      try {
        await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.phone,
            from: process.env.TERMII_SENDER_ID || 'Vitafoam',
            sms: `Vitafoam password reset code is ${data.otp}. Valid for 5 mins. If unrecognized, secure your account immediately.`,
            type: 'plain',
            channel: 'dnd',
            api_key: termiiApiKey,
          }),
        });
        this.logger.log(`Termii SMS reset code dispatched to ${data.phone}`);
      } catch (err: any) {
        this.logger.error(`Failed to send SMS reset code: ${err.message}`);
      }
    }
  }
}
