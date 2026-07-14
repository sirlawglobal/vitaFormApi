import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { EXCHANGE_NAMES } from '../../common/constants/exchange-names.constants';

export interface MessagePayload {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
}

/**
 * MessagingService wraps RabbitMQ.
 * Only the OutboxWorker publishes to RabbitMQ via this service.
 * Domain services NEVER call this directly.
 *
 * Note: amqplib v0.10+ returns ChannelModel from connect().
 * ChannelModel exposes createChannel() and wraps the underlying Connection.
 */
@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  // amqplib.connect() returns ChannelModel in v0.10+
  private channelModel: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const uri = this.config.getOrThrow<string>('rabbitmq.uri');

      // In amqplib v0.10+, connect() returns ChannelModel
      this.channelModel = await amqplib.connect(uri);
      this.channel = await this.channelModel.createChannel();

      // Declare main topic exchange
      await this.channel.assertExchange(
        EXCHANGE_NAMES.DOMAIN_EVENTS,
        'topic',
        { durable: true },
      );

      // Declare dead letter exchange
      await this.channel.assertExchange(
        EXCHANGE_NAMES.DEAD_LETTER,
        'fanout',
        { durable: true },
      );

      const prefetch = this.config.get<number>('rabbitmq.prefetch', 10);
      await this.channel.prefetch(prefetch);

      this.logger.log('RabbitMQ connected and exchanges declared');

      this.channelModel.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error', err);
      });

      this.channelModel.on('close', () => {
        this.logger.warn('RabbitMQ connection closed — reconnecting in 5s...');
        this.channelModel = null;
        this.channel = null;
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.channelModel?.close();
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', error);
    }
  }

  /**
   * Publish a domain event to the exchange.
   * Called exclusively by the OutboxWorker.
   */
  async publish(routingKey: string, message: MessagePayload): Promise<boolean> {
    if (!this.channel) {
      this.logger.error('RabbitMQ channel not available');
      return false;
    }

    try {
      const content = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(
        EXCHANGE_NAMES.DOMAIN_EVENTS,
        routingKey,
        content,
        {
          persistent: true,          // survives broker restart
          contentType: 'application/json',
          timestamp: Date.now(),
          headers: {
            'x-correlation-id': message.correlationId,
            'x-event-type': message.eventType,
          },
        },
      );

      if (!published) {
        this.logger.warn(`Back-pressure detected for routing key: ${routingKey}`);
      }

      return published;
    } catch (error) {
      this.logger.error(`Failed to publish message: ${routingKey}`, error);
      return false;
    }
  }

  /**
   * Assert a queue and bind it to the exchange with a routing key.
   * Called by consumer setup code during module init.
   */
  async assertAndBindQueue(
    queueName: string,
    routingKey: string,
  ): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not initialized');

    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGE_NAMES.DEAD_LETTER,
      },
    });

    await this.channel.bindQueue(
      queueName,
      EXCHANGE_NAMES.DOMAIN_EVENTS,
      routingKey,
    );
  }

  isConnected(): boolean {
    return this.channelModel !== null && this.channel !== null;
  }
}
