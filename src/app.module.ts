import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';

// Config
import {
  appConfig,
  appConfigSchema,
  databaseConfig,
  databaseConfigSchema,
  redisConfig,
  redisConfigSchema,
  storageConfig,
  aiConfig,
  paymentConfig,
  firebaseConfig,
} from './config';

// Infrastructure
import { AppLoggerModule } from './infrastructure/logger/logger.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { OutboxModule } from './infrastructure/outbox/outbox.module';
import { HealthModule } from './infrastructure/health/health.module';
import { StorageModule } from './infrastructure/storage/storage.module';

// Common
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

// Domain Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

const ENV = process.env.APP_ENV ?? 'development';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${ENV}`, '.env'],
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        storageConfig,
        aiConfig,
        paymentConfig,
        firebaseConfig,
      ],
      validationSchema: appConfigSchema
        .concat(databaseConfigSchema)
        .concat(redisConfigSchema),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ── Core Infrastructure ─────────────────────────────────────────────────
    AppLoggerModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    OutboxModule,
    HealthModule,
    StorageModule,

    // ── Framework Utilities ─────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
    ]),
    EventEmitterModule.forRoot({ wildcard: true }),
    ScheduleModule.forRoot(),

    // ── Domain Modules ──────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    NotificationsModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    // CartModule,
    // CheckoutModule,
    // OrdersModule,
    // PaymentsModule,
    // WishlistModule,
    // ReviewsModule,
    // RecommendationModule,
    // MattressFinderModule,
    // SleepQuizModule,
    // DealersModule,
    // WarrantyModule,
    // PromotionsModule,
    // CouponsModule,
    // SupportChatModule,
    // ArticlesModule,
    // SearchModule,
    // AnalyticsModule,
    // AdminModule,
    // SettingsModule,
  ],

  providers: [
    // Global exception handler — catches ALL exceptions
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Global response wrapper — wraps ALL success responses
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },

    // Global request/response logger
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },

    // Global input sanitization
    { provide: APP_PIPE, useClass: SanitizePipe },

    // Throttle guard — rate limiting via ThrottlerModule
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global zero-trust session authentication guard (checked unless @Public())
    { provide: APP_GUARD, useClass: SessionAuthGuard },

    // Global RBAC role verification guard
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global fine-grained permission verification guard
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply correlation ID middleware to ALL routes
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
