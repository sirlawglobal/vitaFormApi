import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const rabbitmqConfigSchema = Joi.object({
  RABBITMQ_URI: Joi.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('vitaform.domain.events'),
  RABBITMQ_DLX: Joi.string().default('vitaform.dead.letter'),
  RABBITMQ_PREFETCH: Joi.number().default(10),
  OUTBOX_POLL_INTERVAL_MS: Joi.number().default(5000),
  OUTBOX_BATCH_SIZE: Joi.number().default(50),
  OUTBOX_MAX_RETRIES: Joi.number().default(5),
});

export default registerAs('rabbitmq', () => ({
  uri: process.env.RABBITMQ_URI ?? 'amqp://guest:guest@localhost:5672',
  exchange: process.env.RABBITMQ_EXCHANGE ?? 'vitaform.domain.events',
  deadLetterExchange: process.env.RABBITMQ_DLX ?? 'vitaform.dead.letter',
  prefetch: parseInt(process.env.RABBITMQ_PREFETCH ?? '10', 10),
  outbox: {
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS ?? '5000', 10),
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE ?? '50', 10),
    maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES ?? '5', 10),
  },
}));
