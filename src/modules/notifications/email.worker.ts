import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';

/**
 * EmailWorker consumes jobs from the 'email.queue' via BullMQ.
 * Dispatches verification OTPs, password reset links, and transactional emails.
 */
@Injectable()
export class EmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorker.name);
  private worker!: Worker;
  private transporter?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('redis.bull.host', 'localhost');
    const port = this.config.get<number>('redis.bull.port', 6379);
    const password = this.config.get<string>('redis.bull.password');
    const db = this.config.get<number>('redis.bull.db', 0);
    const tls = this.config.get<Record<string, unknown> | undefined>('redis.bull.tls');

    const connection = { host, port, password, db, tls };

    // Check Brevo API setup first, then fallback to Nodemailer SMTP
    const brevoApiKey = this.config.get<string>('app.email.brevoApiKey') || process.env.BREVO_API_KEY;
    if (brevoApiKey) {
      this.logger.log(`Brevo API configured for sending emails`);
    } else {
      const smtpHost = this.config.get<string>('app.email.smtpHost') || this.config.get<string>('app.smtpHost') || process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        this.logger.log(`Nodemailer SMTP configured (${smtpHost}:${smtpPort})`);
      }
    }

    this.worker = new Worker(
      QUEUE_NAMES.EMAIL,
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: 1,           // Reduce concurrent connections to minimize Redis commands
        stalledInterval: 30000,   // Check for stalled jobs every 30s (default: 30ms — a major polling flood)
        maxStalledCount: 1,       // Max stall retries before marking job as failed
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Email job [${job.id}] (${job.name}) completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Email job [${job?.id}] (${job?.name}) failed: ${err.message}`, err.stack);
    });

    this.logger.log(`EmailWorker started — listening on '${QUEUE_NAMES.EMAIL}'`);
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
        this.logger.warn(`Unknown email job type: ${name}`);
    }
  }

  private async handleVerificationOtp(data: { email: string; firstName: string; otp: string }): Promise<void> {
    // 1. Log high-visibility developer banner for instant OTP testing
    console.log(`\n============================================================`);
    console.log(`📧 [EMAIL WORKER DISPATCH] — Verification OTP`);
    console.log(`To:      ${data.email}`);
    console.log(`Name:    ${data.firstName}`);
    console.log(`Subject: Vitafoam Mobile Commerce - Verify Your Account`);
    console.log(`OTP Code: [  ${data.otp}  ]`);
    console.log(`Notice:  Valid for 5 minutes. Do not share.`);
    console.log(`============================================================\n`);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #1E3A8A;">Welcome to Vitafoam, ${data.firstName}!</h2>
        <p style="font-size: 16px; color: #333;">Thank you for registering. Please use the verification code below to verify your email address:</p>
        <div style="background-color: #F3F4F6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E3A8A;">${data.otp}</span>
        </div>
        <p style="font-size: 14px; color: #666;">This code expires in 5 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} Vitafoam Nigeria Plc. All rights reserved.</p>
      </div>
    `;

    // 2. Dispatch email via active provider (Brevo API or SMTP)
    await this.sendEmail(data.email, data.firstName, 'Verify your Vitafoam account', html);
  }

  private async handlePasswordResetOtp(data: { email: string; firstName: string; otp: string }): Promise<void> {
    console.log(`\n============================================================`);
    console.log(`📧 [EMAIL WORKER DISPATCH] — Password Reset OTP`);
    console.log(`To:      ${data.email}`);
    console.log(`Name:    ${data.firstName}`);
    console.log(`Subject: Vitafoam - Password Reset Request`);
    console.log(`OTP Code: [  ${data.otp}  ]`);
    console.log(`Notice:  Valid for 5 minutes. Do not share.`);
    console.log(`============================================================\n`);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #DC2626;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #333;">Hi ${data.firstName}, we received a request to reset your password. Use the code below:</p>
        <div style="background-color: #FEF2F2; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #DC2626;">${data.otp}</span>
        </div>
        <p style="font-size: 14px; color: #666;">This code expires in 5 minutes. If you didn't request a password reset, immediately secure your account.</p>
      </div>
    `;

    await this.sendEmail(data.email, data.firstName, 'Reset your Vitafoam password', html);
  }

  private async sendEmail(to: string, name: string, subject: string, htmlContent: string): Promise<void> {
    const brevoApiKey = this.config.get<string>('app.email.brevoApiKey') || process.env.BREVO_API_KEY;
    const fromEmail = this.config.get<string>('app.email.from') || process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@vitafoam.com.ng';
    const fromName = this.config.get<string>('app.email.fromName') || process.env.EMAIL_FROM_NAME || 'Vitafoam Commerce';

    if (brevoApiKey) {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: fromName, email: fromEmail },
            to: [{ email: to, name }],
            subject,
            htmlContent,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Brevo API error (${response.status}): ${errorBody}`);
        }

        const result = (await response.json()) as { messageId?: string };
        this.logger.log(`Brevo email sent to ${to} (messageId: ${result?.messageId || 'unknown'})`);
      } catch (err: any) {
        this.logger.error(`Failed to send email via Brevo to ${to}: ${err.message}`, err.stack);
        throw err;
      }
    } else if (this.transporter) {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html: htmlContent,
      });
      this.logger.log(`SMTP email sent to ${to}`);
    } else {
      this.logger.warn(`No active email provider configured (BREVO_API_KEY / SMTP). Email to ${to} only logged to console.`);
    }
  }
}
