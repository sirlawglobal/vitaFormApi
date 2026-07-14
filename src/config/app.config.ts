import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const appConfigSchema = Joi.object({
  APP_NAME: Joi.string().default('Vitafoam Backend'),
  APP_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  APP_PORT: Joi.number().default(3000),
  APP_URL: Joi.string().default('http://localhost:3000'),
  APP_VERSION: Joi.string().default('1.0.0'),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('docs'),
  SWAGGER_TITLE: Joi.string().default('Vitafoam API'),
  SWAGGER_DESCRIPTION: Joi.string().default('Vitafoam API Documentation'),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error')
    .default('info'),
  LOG_PRETTY: Joi.boolean().default(false),
  RATE_LIMIT_TTL_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  RATE_LIMIT_AUTH_MAX: Joi.number().default(10),
  SESSION_TTL_SECONDS: Joi.number().default(604800),
  SESSION_MAX_DEVICES: Joi.number().default(5),
});

export default registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'Vitafoam Backend',
  env: process.env.APP_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  url: process.env.APP_URL ?? 'http://localhost:3000',
  version: process.env.APP_VERSION ?? '1.0.0',
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  isProduction: process.env.APP_ENV === 'production',
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH ?? 'docs',
    title: process.env.SWAGGER_TITLE ?? 'Vitafoam API',
    description: process.env.SWAGGER_DESCRIPTION ?? 'Vitafoam API Documentation',
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    pretty: process.env.LOG_PRETTY === 'true',
  },
  rateLimit: {
    ttlMs: parseInt(process.env.RATE_LIMIT_TTL_MS ?? '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
  },
  session: {
    ttlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? '604800', 10),
    maxDevices: parseInt(process.env.SESSION_MAX_DEVICES ?? '5', 10),
  },
}));
