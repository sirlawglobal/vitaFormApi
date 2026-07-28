import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository';
import { ReviewStatus } from './reviews.schema';
import { OrdersRepository } from '../orders/orders.repository';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly outboxService: OutboxService,
    private readonly productsService: ProductsService,
  ) {}

  async submitReview(userId: string, productId: string, data: { rating: number; title: string; body: string; images?: string[] }) {
    // 1. Get product variants to check skus
    const product = await this.productsService.getById(productId);
    const skus = product.variants?.map((v: any) => v.sku) || [];

    // 2. Verify Buyer
    const hasBought = await this.ordersRepository.hasDeliveredProduct(userId, skus);
    if (!hasBought) {
      throw new ForbiddenException('REVIEW_UNVERIFIED_BUYER: You can only review products you have purchased and received.');
    }

    const userOrders = await this.ordersRepository.findByUserId(userId, 1, 100);
    const validOrder = userOrders.items.find(o => 
      o.orderStatus === 'DELIVERED' && 
      o.items.some((li: any) => skus.includes(li.sku))
    );

    if (!validOrder) {
      throw new ForbiddenException('REVIEW_UNVERIFIED_BUYER');
    }

    try {
      // 3. Create Review
      const review = await this.reviewsRepository.create({
        userId,
        productId,
        orderId: validOrder._id as unknown as string,
        rating: data.rating,
        title: data.title,
        body: data.body,
        images: data.images || [],
        status: ReviewStatus.PENDING,
      });

      // 4. Emit Outbox Event
      await this.outboxService.saveEvent({
        aggregateType: 'Review',
        aggregateId: review._id.toString(),
        eventType: DOMAIN_EVENTS.REVIEW_SUBMITTED,
        payload: { reviewId: review._id.toString(), productId, userId },
      });

      return review;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('You have already submitted a review for this product.');
      }
      throw error;
    }
  }

  async getProductReviews(productId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.reviewsRepository.findByProduct(productId, skip, limit);
    const aggregation = await this.reviewsRepository.getRatingAggregation(productId);
    
    return { data, total, aggregation };
  }

  async getMyReviews(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.reviewsRepository.findByUser(userId, skip, limit);
    return { data, total };
  }

  async markHelpful(reviewId: string) {
    const review = await this.reviewsRepository.incrementHelpful(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  // --- Admin Methods ---

  async listPendingReviews(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.reviewsRepository.findByStatus(ReviewStatus.PENDING, skip, limit);
    return { data, total };
  }

  async approveReview(reviewId: string, adminNote?: string) {
    const review = await this.reviewsRepository.updateStatus(reviewId, ReviewStatus.APPROVED, adminNote);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.outboxService.saveEvent({
      aggregateType: 'Review',
      aggregateId: review._id.toString(),
      eventType: DOMAIN_EVENTS.REVIEW_APPROVED,
      payload: { reviewId: review._id.toString(), productId: review.productId.toString(), userId: review.userId.toString() },
    });

    return review;
  }

  async rejectReview(reviewId: string, adminNote: string) {
    const review = await this.reviewsRepository.updateStatus(reviewId, ReviewStatus.REJECTED, adminNote);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.outboxService.saveEvent({
      aggregateType: 'Review',
      aggregateId: review._id.toString(),
      eventType: DOMAIN_EVENTS.REVIEW_REJECTED,
      payload: { reviewId: review._id.toString(), productId: review.productId.toString(), userId: review.userId.toString(), reason: adminNote },
    });

    return review;
  }
}
