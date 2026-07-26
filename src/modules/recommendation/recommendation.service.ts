import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { SleepQuizRepository } from '../sleep-quiz/sleep-quiz.repository';
import { ProductsRepository } from '../products/products.repository';
import { Product } from '../products/products.schema';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly sleepQuizRepository: SleepQuizRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async getUserRecommendations(userId: string): Promise<{
    primaryProduct: Product | null;
    alternatives: Product[];
    accessories: Product[];
    rationale?: string;
  }> {
    // 1. Try to fetch cached recommendation result from Redis
    const cacheKey = `vitaform:rec:${userId}`;
    const cachedData = await this.cacheService.get<string>(cacheKey);

    let recData: any = null;
    if (cachedData) {
      try {
        recData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      } catch (e) {
        this.logger.warn(`Failed to parse cached recommendations for user ${userId}`);
      }
    }

    // 2. If not in cache, fallback to latest SleepQuiz document from MongoDB
    if (!recData) {
      const quiz = await this.sleepQuizRepository.findLatestByUserId(userId);
      if (quiz && quiz.status === 'COMPLETED') {
        recData = {
          bestMattressSku: quiz.bestMattressSku,
          alternativeSkus: quiz.alternativeSkus,
          accessorySkus: [...quiz.pillowSkus, ...quiz.protectorSkus, ...quiz.accessorySkus],
          rationale: quiz.aiRationale,
        };
      }
    }

    // 3. Resolve SKUs to actual Product entities
    if (recData) {
      const primaryProduct = recData.bestMattressSku
        ? await this.productsRepository.findBySku(recData.bestMattressSku)
        : null;

      const alternatives = await this.resolveSkus(recData.alternativeSkus || []);
      const accessories = await this.resolveSkus(recData.accessorySkus || []);

      return {
        primaryProduct,
        alternatives,
        accessories,
        rationale: recData.rationale,
      };
    }

    // 4. If no profile exists, return default popular mattresses
    const { items: defaultProducts } = await this.productsRepository.findWithFilter(
      { isActive: true },
      { createdAt: -1 },
      1,
      5,
    );

    return {
      primaryProduct: defaultProducts[0] || null,
      alternatives: defaultProducts.slice(1, 3),
      accessories: defaultProducts.slice(3, 5),
      rationale: 'Popular orthopedic selections based on community preference.',
    };
  }

  async getPopularRecommendations(limit = 6): Promise<Product[]> {
    const { items } = await this.productsRepository.findWithFilter(
      { isActive: true },
      { viewCount: -1, createdAt: -1 },
      1,
      limit,
    );
    return items;
  }

  async getTrendingRecommendations(limit = 6): Promise<Product[]> {
    const { items } = await this.productsRepository.findWithFilter(
      { isActive: true, isFeatured: true },
      { createdAt: -1 },
      1,
      limit,
    );
    return items;
  }

  async queryMattressFinder(query: {
    firmness?: string;
    size?: string;
    maxPrice?: number;
  }): Promise<Product[]> {
    const filter: Record<string, any> = { isActive: true };

    if (query.maxPrice) {
      filter.basePrice = { $lte: query.maxPrice };
    }

    const { items } = await this.productsRepository.findWithFilter(
      filter,
      { createdAt: -1 },
      1,
      10,
    );

    return items;
  }

  private async resolveSkus(skus: string[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const sku of skus) {
      const product = await this.productsRepository.findBySku(sku);
      if (product) {
        products.push(product);
      }
    }
    return products;
  }
}
