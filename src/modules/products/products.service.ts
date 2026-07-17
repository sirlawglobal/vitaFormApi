import { Injectable, Logger } from '@nestjs/common';
import { ClientSession, FilterQuery, Types } from 'mongoose';
import { ProductsRepository } from './products.repository';
import { CategoriesService } from '../categories/categories.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
  ProductSortBy,
} from './dto';
import { Product } from './products.schema';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import {
  NotFoundException,
  ConflictException,
} from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly ITEM_CACHE_TTL = 3600; // 1 hour
  private readonly LIST_CACHE_TTL = 600;  // 10 minutes

  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly cacheService: CacheService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Create product, invalidate list caches, and emit ProductCreated outbox event.
   */
  async createProduct(dto: CreateProductDto, session?: ClientSession): Promise<Product> {
    const category = await this.categoriesService.getById(dto.categoryId);

    const existingSlug = await this.productsRepository.findBySlugAdmin(dto.slug);
    if (existingSlug) {
      throw new ConflictException(
        ERROR_CODES.CONFLICT,
        `Product with slug '${dto.slug}' already exists`,
      );
    }

    if (dto.variants && dto.variants.length > 0) {
      for (const v of dto.variants) {
        const existingSku = await this.productsRepository.findBySku(v.sku);
        if (existingSku) {
          throw new ConflictException(
            ERROR_CODES.CONFLICT,
            `Product variant SKU '${v.sku}' already exists across catalog`,
          );
        }
      }
    }

    const product = await this.productsRepository.create({
      ...dto,
      categoryId: new Types.ObjectId(dto.categoryId),
      slug: dto.slug.toLowerCase().trim(),
      categorySlug: category.slug,
    });

    await this.cacheService.deleteByPattern('vitaform:products:list:*');

    await this.outboxService.saveEvent(
      {
        aggregateType: 'Product',
        aggregateId: product._id.toString(),
        eventType: 'ProductCreated',
        payload: product.toObject() as Record<string, unknown>,
      },
      session,
    );

    this.logger.log(`Created product [${product.slug}] with ${dto.variants?.length || 0} variant(s)`);
    return product;
  }

  /**
   * Query products with filtering, search, sorting, pagination, and Redis caching.
   */
  async queryProducts(dto: QueryProductsDto): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = `vitaform:products:list:${JSON.stringify(dto)}`;
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const filter: FilterQuery<Product> = { isActive: true };

        if (dto.categorySlug) {
          filter.categorySlug = dto.categorySlug.toLowerCase().trim();
        }

        if (dto.firmness) {
          filter['variants.firmness'] = dto.firmness;
        }

        if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
          filter['variants.price'] = {};
          if (dto.minPrice !== undefined) filter['variants.price'].$gte = dto.minPrice;
          if (dto.maxPrice !== undefined) filter['variants.price'].$lte = dto.maxPrice;
        }

        if (dto.tag) {
          filter.tags = dto.tag.toLowerCase().trim();
        }

        if (dto.isFeatured !== undefined) {
          filter.isFeatured = dto.isFeatured;
        }

        if (dto.search) {
          const searchRegex = new RegExp(dto.search.trim(), 'i');
          filter.$or = [
            { name: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
            { 'variants.name': searchRegex },
            { 'variants.sku': searchRegex },
          ];
        }

        let sort: Record<string, 1 | -1> = { createdAt: -1 };
        switch (dto.sortBy) {
          case ProductSortBy.PRICE_ASC:
            sort = { 'variants.price': 1 };
            break;
          case ProductSortBy.PRICE_DESC:
            sort = { 'variants.price': -1 };
            break;
          case ProductSortBy.RATING:
            sort = { rating: -1, reviewCount: -1 };
            break;
          case ProductSortBy.NEWEST:
          default:
            sort = { createdAt: -1 };
            break;
        }

        const page = dto.page || 1;
        const limit = dto.limit || 20;
        const result = await this.productsRepository.findWithFilter(filter, sort, page, limit);

        return {
          items: result.items,
          total: result.total,
          page,
          limit,
        };
      },
      this.LIST_CACHE_TTL,
    );
  }

  /**
   * Get product detail by URL slug (cached for 1 hour).
   */
  async getBySlug(slug: string): Promise<Product> {
    const cleanSlug = slug.toLowerCase().trim();
    const cacheKey = `vitaform:product:slug:${cleanSlug}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const product = await this.productsRepository.findBySlug(cleanSlug);
        if (!product) {
          throw new NotFoundException(
            ERROR_CODES.PRODUCT_NOT_FOUND,
            `Product with slug '${slug}' not found or inactive`,
          );
        }
        return product;
      },
      this.ITEM_CACHE_TTL,
    );
  }

  /**
   * Get product detail by ID (cached for 1 hour).
   */
  async getById(id: string): Promise<Product> {
    const cacheKey = `vitaform:product:id:${id}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const product = await this.productsRepository.findById(id);
        if (!product || !product.isActive) {
          throw new NotFoundException(
            ERROR_CODES.PRODUCT_NOT_FOUND,
            `Product with ID '${id}' not found or inactive`,
          );
        }
        return product;
      },
      this.ITEM_CACHE_TTL,
    );
  }

  /**
   * Get product by SKU across all variants.
   */
  async getBySku(sku: string): Promise<{ product: Product; variant: any }> {
    const product = await this.productsRepository.findBySku(sku);
    if (!product || !product.isActive) {
      throw new NotFoundException(
        ERROR_CODES.VARIANT_NOT_FOUND,
        `Product variant with SKU '${sku}' not found`,
      );
    }

    const variant = product.variants.find((v) => v.sku === sku.trim());
    if (!variant) {
      throw new NotFoundException(
        ERROR_CODES.VARIANT_NOT_FOUND,
        `Variant SKU '${sku}' missing from product`,
      );
    }

    return { product, variant };
  }

  /**
   * Get related products in the same category.
   */
  async getRelated(productId: string, limit = 4): Promise<Product[]> {
    const product = await this.getById(productId);
    return this.productsRepository.findRelated(product.categoryId, productId, limit);
  }

  /**
   * Update product details or variants, invalidate caches, and emit ProductUpdated event.
   */
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    session?: ClientSession,
  ): Promise<Product> {
    const existing = await this.productsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        `Product with ID '${id}' not found`,
      );
    }

    let categorySlug = existing.categorySlug;
    if (dto.categoryId && dto.categoryId !== existing.categoryId.toString()) {
      const category = await this.categoriesService.getById(dto.categoryId);
      categorySlug = category.slug;
    }

    const updated = await this.productsRepository.updateById(id, {
      ...dto,
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
      categorySlug,
    });

    if (!updated) {
      throw new NotFoundException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        'Failed to update product',
      );
    }

    await Promise.all([
      this.cacheService.del(`vitaform:product:id:${id}`),
      this.cacheService.del(`vitaform:product:slug:${existing.slug}`),
      ifChangedSlug(updated.slug, existing.slug, this.cacheService),
      this.cacheService.deleteByPattern('vitaform:products:list:*'),
    ]);

    await this.outboxService.saveEvent(
      {
        aggregateType: 'Product',
        aggregateId: updated._id.toString(),
        eventType: 'ProductUpdated',
        payload: updated.toObject() as Record<string, unknown>,
      },
      session,
    );

    this.logger.log(`Updated product [${updated.slug}]`);
    return updated;
  }

  /**
   * Delete product, invalidate caches, and emit ProductDeleted event.
   */
  async deleteProduct(
    id: string,
    session?: ClientSession,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.productsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        ERROR_CODES.PRODUCT_NOT_FOUND,
        `Product with ID '${id}' not found`,
      );
    }

    await this.productsRepository.deleteById(id);

    await Promise.all([
      this.cacheService.del(`vitaform:product:id:${id}`),
      this.cacheService.del(`vitaform:product:slug:${existing.slug}`),
      this.cacheService.deleteByPattern('vitaform:products:list:*'),
    ]);

    await this.outboxService.saveEvent(
      {
        aggregateType: 'Product',
        aggregateId: id,
        eventType: 'ProductDeleted',
        payload: { id, slug: existing.slug },
      },
      session,
    );

    this.logger.log(`Deleted product [${existing.slug}]`);
    return { success: true, message: 'Product deleted successfully' };
  }
}

async function ifChangedSlug(
  newSlug: string,
  oldSlug: string,
  cacheService: CacheService,
): Promise<void> {
  if (newSlug !== oldSlug) {
    await cacheService.del(`vitaform:product:slug:${newSlug}`);
  }
}
