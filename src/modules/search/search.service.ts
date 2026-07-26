import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../products/products.schema';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { QuerySearchDto, SearchSortBy } from './dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  
  // Redis keys
  private readonly AUTOCOMPLETE_KEY = 'vitaform:search:autocomplete';
  private readonly POPULAR_KEY = 'vitaform:search:popular';
  private readonly HISTORY_KEY_PREFIX = 'vitaform:search:history';

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Main Search Engine
   */
  async searchProducts(dto: QuerySearchDto, userId?: string) {
    const filter: any = { isActive: true };

    if (dto.category) {
      filter.categorySlug = dto.category.toLowerCase().trim();
    }

    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      filter['variants.price'] = {};
      if (dto.minPrice !== undefined) filter['variants.price'].$gte = dto.minPrice;
      if (dto.maxPrice !== undefined) filter['variants.price'].$lte = dto.maxPrice;
    }

    let sort: any = {};
    if (dto.q) {
      // Use MongoDB text search
      filter.$text = { $search: dto.q.trim() };
      
      // Default to relevance sort if searching text
      if (dto.sortBy === SearchSortBy.RELEVANCE) {
        sort = { score: { $meta: 'textScore' } };
      }
    }

    if (dto.sortBy !== SearchSortBy.RELEVANCE) {
      switch (dto.sortBy) {
        case SearchSortBy.PRICE_ASC:
          sort = { 'variants.price': 1 };
          break;
        case SearchSortBy.PRICE_DESC:
          sort = { 'variants.price': -1 };
          break;
        case SearchSortBy.RATING:
          sort = { rating: -1, reviewCount: -1 };
          break;
        case SearchSortBy.NEWEST:
        default:
          sort = { createdAt: -1 };
          break;
      }
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.productModel.find(filter);
    
    // If text sorting, must project the score
    if (sort.score) {
      query.select({ score: { $meta: 'textScore' } });
    }
    
    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // Track search query asynchronously if it's a direct text search
    if (dto.q && userId) {
      this.trackSearchQuery(userId, dto.q.trim()).catch(err => 
        this.logger.error('Failed to track search query', err)
      );
    }

    return { items, total, page, limit };
  }

  /**
   * Sub-50ms Autocomplete using Redis ZRANGEBYLEX
   */
  async getAutocompleteSuggestions(prefix: string, limit = 5): Promise<string[]> {
    const cleanPrefix = prefix.toLowerCase().trim();
    if (!cleanPrefix) return [];

    const client = this.cacheService.getClient();
    // In Redis lexicographical sorting, '[' means inclusive.
    // '\xff' is the highest byte, so it matches any suffix.
    const results = await client.zrangebylex(
      this.AUTOCOMPLETE_KEY,
      `[${cleanPrefix}`,
      `[${cleanPrefix}\xff`,
      'LIMIT',
      0,
      limit
    );
    
    return results;
  }

  /**
   * Track History and Popular Searches
   */
  async trackSearchQuery(userId: string, query: string): Promise<void> {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery || cleanQuery.length < 2) return;

    // 1. Update Personal History (List with max 20 items)
    const historyKey = `${this.HISTORY_KEY_PREFIX}:${userId}`;
    const client = this.cacheService.getClient();
    
    const multi = client.multi();
    // Remove if it exists to avoid duplicates, then push to front
    multi.lrem(historyKey, 0, cleanQuery);
    multi.lpush(historyKey, cleanQuery);
    multi.ltrim(historyKey, 0, 19);
    
    // 2. Update Global Popular Trends
    multi.zincrby(this.POPULAR_KEY, 1, cleanQuery);
    
    await multi.exec();
  }

  /**
   * Get User Search History
   */
  async getHistory(userId: string): Promise<string[]> {
    return this.cacheService.lrange(`${this.HISTORY_KEY_PREFIX}:${userId}`, 0, 19);
  }

  /**
   * Clear User Search History
   */
  async clearHistory(userId: string): Promise<void> {
    await this.cacheService.del(`${this.HISTORY_KEY_PREFIX}:${userId}`);
  }

  /**
   * Get Trending/Popular Searches
   */
  async getPopular(limit = 10): Promise<string[]> {
    // Top results from the sorted set
    return this.cacheService.zrevrange(this.POPULAR_KEY, 0, limit - 1);
  }
}
