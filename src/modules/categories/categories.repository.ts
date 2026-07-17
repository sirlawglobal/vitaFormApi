import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Category } from './categories.schema';

@Injectable()
export class CategoriesRepository {
  private readonly logger = new Logger(CategoriesRepository.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
  ) {}

  async create(data: Partial<Category>): Promise<Category> {
    const category = new this.categoryModel(data);
    return category.save();
  }

  async findById(id: string): Promise<Category | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.categoryModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel
      .findOne({ slug: slug.toLowerCase().trim() })
      .exec();
  }

  async findAllActive(): Promise<Category[]> {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .exec();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().sort({ order: 1, name: 1 }).exec();
  }

  async findByPathPrefix(prefix: string): Promise<Category[]> {
    return this.categoryModel
      .find({ path: { $regex: `^${prefix}` } })
      .sort({ path: 1, order: 1 })
      .exec();
  }

  async updateById(
    id: string,
    updateData: Partial<Category>,
  ): Promise<Category | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.categoryModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.categoryModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async countChildren(parentId: string): Promise<number> {
    if (!Types.ObjectId.isValid(parentId)) return 0;
    return this.categoryModel
      .countDocuments({ parentId: new Types.ObjectId(parentId) })
      .exec();
  }
}
