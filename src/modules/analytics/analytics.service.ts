import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { TrackAnalyticsEventDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private eventBuffer: any[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private readonly analyticsRepository: AnalyticsRepository) {
    // Flush event buffer to MongoDB every 5 seconds
    this.flushInterval = setInterval(() => this.flushBuffer(), 5000);
  }

  async trackEvent(dto: TrackAnalyticsEventDto, user?: { userId?: string; email?: string; phone?: string }) {
    const event = {
      ...dto,
      userId: user?.userId ? (user.userId as any) : undefined,
      userEmail: user?.email,
      userPhone: user?.phone,
      createdAt: new Date(),
    };

    this.eventBuffer.push(event);

    // If buffer grows beyond 100 events, flush immediately
    if (this.eventBuffer.length >= 100) {
      await this.flushBuffer();
    }

    return { success: true };
  }

  private async flushBuffer() {
    if (!this.eventBuffer.length) return;
    const eventsToInsert = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.analyticsRepository.batchInsert(eventsToInsert);
      this.logger.debug(`Flushed ${eventsToInsert.length} analytics events to database`);
    } catch (error) {
      this.logger.error('Failed to flush analytics event batch:', error);
    }
  }

  async getDashboardMetrics(groupBy: 'day' | 'week' | 'month' = 'day') {
    const chartData = await this.analyticsRepository.getDashboardChartData(groupBy);
    return {
      groupBy,
      chartData,
    };
  }

  async getFunnelMetrics() {
    return this.analyticsRepository.getFunnelMetrics();
  }

  async getAbandonedCarts(limit = 50) {
    return this.analyticsRepository.getAbandonedCarts(limit);
  }

  async getUserActivityTimeline(userId: string, limit = 50) {
    return this.analyticsRepository.getUserActivityTimeline(userId, limit);
  }
}
