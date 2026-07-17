import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Category } from './categories.schema';
import { CacheService } from '../../infrastructure/cache/cache.service';
import {
  NotFoundException,
  ConflictException,
} from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly TREE_CACHE_KEY = 'vitaform:categories:tree';

  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create a new category and automatically build materialized path.
   */
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoriesRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(
        ERROR_CODES.CATEGORY_SLUG_EXISTS,
        `Category with slug '${dto.slug}' already exists`,
      );
    }

    let path = '/';
    if (dto.parentId) {
      const parent = await this.categoriesRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(
          ERROR_CODES.CATEGORY_NOT_FOUND,
          'Parent category not found',
        );
      }
      path = `${parent.path}${parent.slug}/`;
    }

    const category = await this.categoriesRepository.create({
      ...dto,
      parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : null,
      slug: dto.slug.toLowerCase().trim(),
      path,
    });

    await this.cacheService.del(this.TREE_CACHE_KEY);
    this.logger.log(`Created category [${category.slug}] with path [${path}]`);
    return category;
  }

  /**
   * Get the entire category tree, cached in Redis for 1 hour.
   */
  async getTree(): Promise<Category[]> {
    return this.cacheService.getOrSet(
      this.TREE_CACHE_KEY,
      async () => {
        const categories = await this.categoriesRepository.findAllActive();
        return this.buildTreeStructure(categories);
      },
      3600,
    );
  }

  /**
   * Get flat list of active categories.
   */
  async getActiveCategories(): Promise<Category[]> {
    return this.categoriesRepository.findAllActive();
  }

  /**
   * Get all categories (including inactive, for Admin CRUD).
   */
  async getAllCategoriesAdmin(): Promise<Category[]> {
    return this.categoriesRepository.findAll();
  }

  /**
   * Get category by slug.
   */
  async getBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(
        ERROR_CODES.CATEGORY_NOT_FOUND,
        `Category with slug '${slug}' not found`,
      );
    }
    return category;
  }

  /**
   * Get category by ID.
   */
  async getById(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException(
        ERROR_CODES.CATEGORY_NOT_FOUND,
        `Category with ID '${id}' not found`,
      );
    }
    return category;
  }

  /**
   * Update a category and re-index child paths if parentId or slug changed.
   */
  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.getById(id);

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoriesRepository.findBySlug(dto.slug);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(
          ERROR_CODES.CATEGORY_SLUG_EXISTS,
          `Category with slug '${dto.slug}' already exists`,
        );
      }
    }

    let newPath = category.path;
    if (dto.parentId !== undefined && dto.parentId !== category.parentId?.toString()) {
      if (dto.parentId === null || dto.parentId === '') {
        newPath = '/';
      } else {
        if (dto.parentId === id) {
          throw new ConflictException(
            ERROR_CODES.CONFLICT,
            'A category cannot be its own parent',
          );
        }
        const parent = await this.getById(dto.parentId);
        newPath = `${parent.path}${parent.slug}/`;
      }
    }

    const oldPrefix = `${category.path}${category.slug}/`;
    const updated = await this.categoriesRepository.updateById(id, {
      ...dto,
      parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : undefined,
      path: newPath,
    });

    if (!updated) {
      throw new NotFoundException(
        ERROR_CODES.CATEGORY_NOT_FOUND,
        'Category update failed',
      );
    }

    // If path or slug changed, update all subcategory paths using prefix match
    const newSlug = dto.slug ? dto.slug.toLowerCase().trim() : category.slug;
    const newPrefix = `${newPath}${newSlug}/`;
    if (oldPrefix !== newPrefix) {
      const subcategories = await this.categoriesRepository.findByPathPrefix(oldPrefix);
      for (const sub of subcategories) {
        const childPath = sub.path.replace(oldPrefix, newPrefix);
        await this.categoriesRepository.updateById(sub._id.toString(), {
          path: childPath,
        });
      }
      this.logger.log(`Re-indexed ${subcategories.length} subcategories from ${oldPrefix} to ${newPrefix}`);
    }

    await this.cacheService.del(this.TREE_CACHE_KEY);
    return updated;
  }

  /**
   * Delete a category (only allowed if no subcategories exist).
   */
  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.getById(id);
    const childCount = await this.categoriesRepository.countChildren(id);
    if (childCount > 0) {
      throw new ConflictException(
        ERROR_CODES.CATEGORY_NOT_EMPTY,
        `Cannot delete category '${category.name}' because it contains ${childCount} subcategory(ies). Delete or move them first.`,
      );
    }

    await this.categoriesRepository.deleteById(id);
    await this.cacheService.del(this.TREE_CACHE_KEY);
    this.logger.log(`Deleted category [${category.slug}]`);
    return { success: true, message: 'Category deleted successfully' };
  }

  /**
   * Helper to structure flat list into hierarchical tree nodes.
   */
  private buildTreeStructure(categories: Category[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const cat of categories) {
      map.set(cat._id.toString(), {
        ...cat.toObject(),
        children: [],
      });
    }

    for (const cat of categories) {
      const node = map.get(cat._id.toString());
      if (cat.parentId && map.has(cat.parentId.toString())) {
        map.get(cat.parentId.toString()).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
