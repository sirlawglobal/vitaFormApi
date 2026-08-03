import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsEventListener } from './analytics-event.listener';
import { AnalyticsEvent, AnalyticsEventSchema } from './schemas/analytics-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository, AnalyticsEventListener],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
