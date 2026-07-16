import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';

/**
 * PushWorker consumes jobs from 'notification.queue' via BullMQ.
 * Dispatches real-time iOS/Android push notifications via Firebase Cloud Messaging (FCM).
 */
@Injectable()
export class PushWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushWorker.name);
  private worker!: Worker;
  private isFirebaseInitialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.initializeFirebase();

    const host = this.config.get<string>('redis.bull.host', 'localhost');
    const port = this.config.get<number>('redis.bull.port', 6379);
    const password = this.config.get<string>('redis.bull.password');
    const db = this.config.get<number>('redis.bull.db', 0);
    const tls = this.config.get<Record<string, unknown> | undefined>('redis.bull.tls');

    const connection = { host, port, password, db, tls };

    this.worker = new Worker(
      QUEUE_NAMES.NOTIFICATION,
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
      this.logger.debug(`Push job [${job.id}] (${job.name}) completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Push job [${job?.id}] (${job?.name}) failed: ${err.message}`, err.stack);
    });

    this.logger.log(`PushWorker started — listening on '${QUEUE_NAMES.NOTIFICATION}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private initializeFirebase(): void {
    if (admin.apps.length > 0) {
      this.isFirebaseInitialized = true;
      return;
    }

    const projectId = this.config.get<string>('firebase.projectId') || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = this.config.get<string>('firebase.clientEmail') || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (this.config.get<string>('firebase.privateKey') || process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const serviceAccountPath = this.config.get<string>('firebase.serviceAccountPath') || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    try {
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        this.isFirebaseInitialized = true;
        this.logger.log(`Firebase Admin SDK initialized from file: ${serviceAccountPath}`);
      } else if (projectId && clientEmail && privateKey && projectId !== 'placeholder' && privateKey !== 'placeholder') {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.isFirebaseInitialized = true;
        this.logger.log(`Firebase Admin SDK initialized for project: ${projectId}`);
      } else {
        this.logger.debug('Firebase Admin SDK not configured (using dev terminal push banner fallback)');
      }
    } catch (err: any) {
      this.logger.error(`Failed to initialize Firebase Admin SDK: ${err.message}`);
    }
  }

  private async processJob(job: Job): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case JOB_NAMES.SEND_PUSH:
      case 'send-push':
        await this.handleSendPush(data);
        break;
      default:
        // Handle generic push notifications
        await this.handleSendPush(data);
    }
  }

  private async handleSendPush(data: {
    userId?: string;
    fcmToken?: string | string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    console.log(`\n============================================================`);
    console.log(`🔔 [PUSH NOTIFICATION WORKER DISPATCH]`);
    console.log(`To User:  ${data.userId || 'N/A'}`);
    console.log(`Token(s): ${Array.isArray(data.fcmToken) ? data.fcmToken.join(', ') : data.fcmToken || 'ALL_USER_DEVICES'}`);
    console.log(`Title:    ${data.title}`);
    console.log(`Body:     ${data.body}`);
    if (data.data) {
      console.log(`Data payload: ${JSON.stringify(data.data)}`);
    }
    console.log(`============================================================\n`);

    if (this.isFirebaseInitialized && data.fcmToken) {
      const tokens = Array.isArray(data.fcmToken) ? data.fcmToken : [data.fcmToken];
      const validTokens = tokens.filter((t) => typeof t === 'string' && t.trim().length > 0);

      if (validTokens.length === 0) return;

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: validTokens,
          notification: {
            title: data.title,
            body: data.body,
          },
          data: data.data || {},
        });
        this.logger.log(`FCM Multicast sent: ${response.successCount} successful, ${response.failureCount} failed`);
      } catch (err: any) {
        this.logger.error(`FCM send error: ${err.message}`);
      }
    }
  }
}
