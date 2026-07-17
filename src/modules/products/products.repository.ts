import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Product } from './products.schema';

@Injectable()
export class ProductsRepository {
  private readonly logger = new Logger(ProductsRepository.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async create(data: Partial<Product>): Promise<Product> {
    const product = new this.productModel(data);
    return product.save();
  }

  async findById(id: string): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.productModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.productModel
      .findOne({ slug: slug.toLowerCase().trim(), isActive: true })
      .exec();
  }

  async findBySlugAdmin(slug: string): Promise<Product | null> {
    return this.productModel
      .findOne({ slug: slug.toLowerCase().trim() })
      .exec();
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.productModel
      .findOne({ 'variants.sku': sku.trim() })
      .exec();
  }

  async findWithFilter(
    filter: FilterQuery<Product>,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    page = 1,
    limit = 20,
  ): Promise<{ items: Product[]; total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.productModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findRelated(
    categoryId: string | Types.ObjectId,
    excludeProductId: string,
    limit = 4,
  ): Promise<Product[]> {
    if (!Types.ObjectId.isValid(excludeProductId)) return [];

    return this.productModel
      .find({
        categoryId: new Types.ObjectId(categoryId),
        _id: { $ne: new Types.ObjectId(excludeProductId) },
        isActive: true,
      })
      .limit(limit)
      .exec();
  }

  async updateById(
    id: string,
    updateData: Partial<Product>,
  ): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.productModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
