import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument, AnalyticsEventType } from './schemas/analytics-event.schema';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsEventModel: Model<AnalyticsEventDocument>,
  ) {}

  async batchInsert(events: Partial<AnalyticsEvent>[]): Promise<void> {
    if (!events.length) return;
    await this.analyticsEventModel.insertMany(events, { ordered: false });
  }

  async getDashboardChartData(groupBy: 'day' | 'week' | 'month' = 'day') {
    let dateFormat = '%Y-%m-%d';
    if (groupBy === 'week') dateFormat = '%Y-W%V';
    if (groupBy === 'month') dateFormat = '%Y-%m';

    const pipeline: any[] = [
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          views: {
            $sum: { $cond: [{ $eq: ['$eventType', AnalyticsEventType.PRODUCT_VIEW] }, 1, 0] },
          },
          addToCarts: {
            $sum: { $cond: [{ $eq: ['$eventType', AnalyticsEventType.ADD_TO_CART] }, 1, 0] },
          },
          checkouts: {
            $sum: { $cond: [{ $eq: ['$eventType', AnalyticsEventType.CHECKOUT_START] }, 1, 0] },
          },
          purchases: {
            $sum: { $cond: [{ $eq: ['$eventType', AnalyticsEventType.PURCHASE] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    return this.analyticsEventModel.aggregate(pipeline).exec();
  }

  async getFunnelMetrics() {
    const pipeline: any[] = [
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline).exec();
    const map: Record<string, number> = {};
    results.forEach((r) => {
      map[r._id] = r.count;
    });

    const productViews = map[AnalyticsEventType.PRODUCT_VIEW] || 0;
    const addToCarts = map[AnalyticsEventType.ADD_TO_CART] || 0;
    const checkoutsStarted = map[AnalyticsEventType.CHECKOUT_START] || 0;
    const purchasesCompleted = map[AnalyticsEventType.PURCHASE] || 0;

    const conversionRate = productViews > 0 ? (purchasesCompleted / productViews) * 100 : 0;

    return {
      productViews,
      addToCarts,
      checkoutsStarted,
      purchasesCompleted,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    };
  }

  async getAbandonedCarts(limit = 50) {
    // Find users who have ADD_TO_CART or CHECKOUT_START within last 3 days but NO PURCHASE
    const recentCartEvents = await this.analyticsEventModel
      .find({
        eventType: { $in: [AnalyticsEventType.ADD_TO_CART, AnalyticsEventType.CHECKOUT_START] },
        userId: { $exists: true, $ne: null },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    const userIds = Array.from(new Set(recentCartEvents.map((e) => e.userId?.toString()))).filter(Boolean);

    // Check which of these users have completed a purchase
    const purchases = await this.analyticsEventModel
      .find({
        eventType: AnalyticsEventType.PURCHASE,
        userId: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      })
      .exec();

    const purchasedUserSet = new Set(purchases.map((p) => p.userId?.toString()));

    // Filter down to users who did NOT purchase
    const abandonedEventsMap = new Map<string, any>();
    recentCartEvents.forEach((e) => {
      const uId = e.userId?.toString();
      if (uId && !purchasedUserSet.has(uId) && !abandonedEventsMap.has(uId)) {
        abandonedEventsMap.set(uId, {
          userId: uId,
          userEmail: e.userEmail,
          userPhone: e.userPhone,
          eventType: e.eventType,
          metadata: e.metadata,
          lastActivityAt: e.createdAt,
        });
      }
    });

    return Array.from(abandonedEventsMap.values()).slice(0, limit);
  }

  async getUserActivityTimeline(userId: string, limit = 50) {
    return this.analyticsEventModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
