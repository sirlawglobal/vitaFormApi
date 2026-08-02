import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article } from './articles.schema';

@Injectable()
export class ArticlesRepository {
  constructor(
    @InjectModel(Article.name)
    private readonly articleModel: Model<Article>,
  ) {}

  async create(data: Partial<Article>): Promise<Article> {
    const article = new this.articleModel(data);
    return article.save();
  }

  async findPublished(
    tag?: string,
    skip = 0,
    limit = 10,
  ): Promise<[Article[], number]> {
    const filter: any = { isPublished: true };
    if (tag) {
      filter.tags = tag;
    }

    const [items, total] = await Promise.all([
      this.articleModel
        .find(filter)
        .populate('authorId', 'firstName lastName profilePicture')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.articleModel.countDocuments(filter).exec(),
    ]);

    return [items, total];
  }

  async findAllAdmin(
    page = 1,
    limit = 10,
    search?: string,
    isPublished?: boolean,
  ): Promise<{ data: Article[]; total: number }> {
    const filter: any = {};
    if (isPublished !== undefined) {
      filter.isPublished = isPublished;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.articleModel
        .find(filter)
        .populate('authorId', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.articleModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  async findBySlug(slug: string): Promise<Article | null> {
    return this.articleModel
      .findOne({ slug })
      .populate('authorId', 'firstName lastName profilePicture')
      .exec();
  }

  async findById(id: string): Promise<Article | null> {
    return this.articleModel.findById(id).exec();
  }

  async update(id: string, data: Partial<Article>): Promise<Article | null> {
    return this.articleModel.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.articleModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
