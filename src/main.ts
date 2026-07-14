import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until Pino logger is ready
  });

  const config = app.get(ConfigService);

  // ── Pino structured logger ──────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Security headers via Helmet ──────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
        },
      },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  const corsOrigins = config.get<string[]>('app.corsOrigins', ['http://localhost:3000']);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Token',
      'X-Correlation-ID',
      'X-Device-ID',
      'X-Platform',
    ],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: true,
  });

  // ── API versioning ───────────────────────────────────────────────────────
  const apiPrefix = config.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/live', 'health/ready', 'metrics'],
  });

  // ── Global Validation Pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip undeclared properties
      forbidNonWhitelisted: true, // Throw on undeclared properties
      transform: true,          // Auto-transform to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Swagger Documentation ────────────────────────────────────────────────
  const swaggerEnabled = config.get<boolean>('app.swagger.enabled', true);
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.get<string>('app.swagger.title', 'Vitafoam API'))
      .setDescription(
        config.get<string>(
          'app.swagger.description',
          'Vitafoam Mobile Commerce Platform API',
        ),
      )
      .setVersion(config.get<string>('app.version', '1.0.0'))
      .addTag('Auth', 'Authentication & session management')
      .addTag('Users', 'User profile & device management')
      .addTag('Products', 'Product catalog')
      .addTag('Categories', 'Product categories')
      .addTag('Inventory', 'Stock management')
      .addTag('Cart', 'Shopping cart')
      .addTag('Checkout', 'Checkout flow')
      .addTag('Orders', 'Order management')
      .addTag('Payments', 'Payment processing')
      .addTag('Wishlist', 'Saved items')
      .addTag('Reviews', 'Product reviews')
      .addTag('Recommendation', 'AI-powered recommendations')
      .addTag('Mattress Finder', 'Mattress recommendation engine')
      .addTag('Sleep Quiz', 'Sleep profile quiz')
      .addTag('Dealers', 'Dealer locator')
      .addTag('Warranty', 'Warranty registration & claims')
      .addTag('Promotions', 'Promotions & coupons')
      .addTag('Notifications', 'Push notifications')
      .addTag('Support Chat', 'Customer support chat')
      .addTag('Articles', 'Blog & articles')
      .addTag('Search', 'Full-text search')
      .addTag('Analytics', 'Platform analytics')
      .addTag('Admin', 'Admin portal')
      .addTag('Health', 'Health checks')
      .addApiKey(
        { type: 'apiKey', name: 'X-Session-Token', in: 'header' },
        'session-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // ── Progressive Swagger Tag Filtering ──────────────────────────────────
    // Automatically prune unbuilt/future phase tags from the UI so only active tags
    // with existing endpoints (Phase 1-3: Health & Auth) are displayed right now.
    if (document.tags && document.paths) {
      const activeTags = new Set<string>();
      Object.values(document.paths).forEach((pathItem) => {
        if (!pathItem) return;
        Object.values(pathItem).forEach((operation: any) => {
          if (operation && Array.isArray(operation.tags)) {
            operation.tags.forEach((tag: string) => activeTags.add(tag));
          }
        });
      });
      document.tags = document.tags.filter((tag) => activeTags.has(tag.name));
    }

    const swaggerPath = config.get<string>('app.swagger.path', 'docs');
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
      },
    });

    const appUrl = config.get<string>('app.url', 'http://localhost:3000');
    console.log(`📚 Swagger docs: ${appUrl}/${swaggerPath}`);
  }

  // ── Graceful shutdown ────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start server ─────────────────────────────────────────────────────────
  const port = config.get<number>('app.port', 3000);
  await app.listen(port);

  const appUrl = config.get<string>('app.url', `http://localhost:${port}`);
  const env = config.get<string>('app.env', 'development');

  console.log(`\n🚀 Vitafoam Backend running in ${env} mode`);
  console.log(`📡 API: ${appUrl}/${apiPrefix}`);
  console.log(`❤️  Health: ${appUrl}/health\n`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
