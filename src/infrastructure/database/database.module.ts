import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
        dbName: config.get<string>('database.dbName', 'vitaForm'),
        // Connection pool settings for production
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // Automatic index creation in dev; disabled in prod for safety
        autoIndex: config.get<string>('app.env') !== 'production',
        // Retry writes for better resilience
        retryWrites: true,
        // Write concern: majority ensures durability
        w: 'majority',
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
