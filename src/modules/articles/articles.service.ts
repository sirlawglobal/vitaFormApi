import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly articlesRepository: ArticlesRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async getPublishedArticles(tag?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.articlesRepository.findPublished(tag, skip, limit);
    return { data, total };
  }

  async getArticleBySlug(slug: string) {
    const article = await this.articlesRepository.findBySlug(slug);
    if (!article || !article.isPublished) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  // --- Admin Methods ---

  async getAllArticlesAdmin(page = 1, limit = 10, search?: string, isPublished?: boolean) {
    return this.articlesRepository.findAllAdmin(page, limit, search, isPublished);
  }

  async createArticle(authorId: string, data: any) {
    // Generate slug from title if not provided
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    const existing = await this.articlesRepository.findBySlug(slug);
    if (existing) {
      throw new BadRequestException('An article with this slug already exists.');
    }

    return this.articlesRepository.create({
      ...data,
      slug,
      authorId,
    });
  }

  async updateArticle(id: string, data: any) {
    const updated = await this.articlesRepository.update(id, data);
    if (!updated) {
      throw new NotFoundException('Article not found');
    }
    return updated;
  }

  async publishArticle(id: string) {
    const updated = await this.articlesRepository.update(id, {
      isPublished: true,
      publishedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException('Article not found');
    }

    await this.outboxService.saveEvent({
      aggregateType: 'Article',
      aggregateId: updated._id.toString(),
      eventType: DOMAIN_EVENTS.ARTICLE_PUBLISHED,
      payload: { articleId: updated._id.toString(), slug: updated.slug },
    });

    return updated;
  }

  async deleteArticle(id: string) {
    const deleted = await this.articlesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Article not found');
    }
    return true;
  }
}
