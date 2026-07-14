import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const databaseConfigSchema = Joi.object({
  MONGODB_URI: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().default('vitaform'),
});

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vitaform',
  dbName: process.env.MONGODB_DB_NAME ?? 'vitaform',
}));
