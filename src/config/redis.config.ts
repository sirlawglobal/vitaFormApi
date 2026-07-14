import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const redisConfigSchema = Joi.object({
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_KEY_PREFIX: Joi.string().default('vitaform:'),
  REDIS_TLS: Joi.boolean().default(false),
  BULL_REDIS_HOST: Joi.string().default('localhost'),
  BULL_REDIS_PORT: Joi.number().default(6379),
  BULL_REDIS_PASSWORD: Joi.string().allow('').optional(),
  BULL_REDIS_DB: Joi.number().default(1),
});

export default registerAs('redis', () => {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const bullHost = process.env.BULL_REDIS_HOST ?? 'localhost';
  const useTls =
    process.env.REDIS_TLS === 'true' ||
    host.includes('upstash.io') ||
    host.includes('.cloud');

  return {
    host,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'vitaform:',
    tls: useTls ? {} : undefined,
    bull: {
      host: bullHost,
      port: parseInt(process.env.BULL_REDIS_PORT ?? '6379', 10),
      password: process.env.BULL_REDIS_PASSWORD || undefined,
      db: parseInt(process.env.BULL_REDIS_DB ?? '1', 10),
      tls:
        useTls || bullHost.includes('upstash.io') || bullHost.includes('.cloud')
          ? {}
          : undefined,
    },
  };
});
