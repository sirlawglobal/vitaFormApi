import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { ReviewsRepository } from './reviews.repository';
import { ProductsRepository } from '../products/products.repository';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class ReviewsListener {
  private readonly logger = new Logger(ReviewsListener.name);

  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly cacheService: CacheService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.REVIEW_APPROVED)
  async handleReviewApproved(event: any) {
    const payload = event?.payload || event;
    const productId = payload.productId;
    if (!productId) return;

    this.logger.log(`Handling ${DOMAIN_EVENTS.REVIEW_APPROVED} to update product ${productId} ratings`);
    
    try {
      // Recalculate aggregation
      const aggregation = await this.reviewsRepository.getRatingAggregation(productId);
      
      // Update product document
      const updatedProduct = await this.productsRepository.updateById(productId, {
        rating: aggregation.averageRating,
        reviewCount: aggregation.totalCount,
      });

      if (updatedProduct) {
        // Invalidate caches
        await this.cacheService.del(`product:id:${productId}`);
        await this.cacheService.del(`product:slug:${updatedProduct.slug}`);
        await this.cacheService.deleteByPattern('products:list:*');
        this.logger.log(`Product ${productId} ratings updated: rating=${aggregation.averageRating}, count=${aggregation.totalCount}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update product ${productId} ratings after review approval`, error);
    }
  }

  @OnEvent(DOMAIN_EVENTS.REVIEW_REJECTED)
  async handleReviewRejected(event: any) {
    const payload = event?.payload || event;
    const productId = payload.productId;
    if (!productId) return;

    this.logger.log(`Handling ${DOMAIN_EVENTS.REVIEW_REJECTED} to update product ${productId} ratings`);
    
    try {
      // Recalculate aggregation
      const aggregation = await this.reviewsRepository.getRatingAggregation(productId);
      
      // Update product document
      const updatedProduct = await this.productsRepository.updateById(productId, {
        rating: aggregation.averageRating,
        reviewCount: aggregation.totalCount,
      });

      if (updatedProduct) {
        // Invalidate caches
        await this.cacheService.del(`product:id:${productId}`);
        await this.cacheService.del(`product:slug:${updatedProduct.slug}`);
        await this.cacheService.deleteByPattern('products:list:*');
        this.logger.log(`Product ${productId} ratings updated: rating=${aggregation.averageRating}, count=${aggregation.totalCount}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update product ${productId} ratings after review rejection`, error);
    }
  }
}
