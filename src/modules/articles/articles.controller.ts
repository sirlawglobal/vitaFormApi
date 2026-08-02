import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedRequest } from '../../common/types/session.types';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Articles (Blog)')
@ApiBearerAuth()
@Controller()
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Public()
  @Get('articles')
  async getPublishedArticles(
    @Query('tag') tag?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const { data, total } = await this.articlesService.getPublishedArticles(tag, parseInt(page, 10), parseInt(limit, 10));
    return {
      message: 'Articles retrieved successfully',
      data,
      meta: { page: parseInt(page, 10), limit: parseInt(limit, 10), total },
    };
  }

  @Public()
  @Get('articles/:slug')
  async getArticleBySlug(@Param('slug') slug: string) {
    const article = await this.articlesService.getArticleBySlug(slug);
    return {
      message: 'Article retrieved successfully',
      data: article,
    };
  }

  // --- Admin Routes ---

  @Get('admin/articles')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllArticlesAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isPublished') isPublished?: boolean,
  ) {
    const { data, total } = await this.articlesService.getAllArticlesAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      isPublished !== undefined ? String(isPublished) === 'true' : undefined,
    );
    return {
      message: 'Admin articles retrieved successfully',
      data,
      meta: { page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, total },
    };
  }

  @Post('admin/articles')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createArticle(@Req() req: AuthenticatedRequest, @Body() dto: CreateArticleDto) {
    const article = await this.articlesService.createArticle(req.session.userId, dto);
    return {
      message: 'Article draft created successfully',
      data: article,
    };
  }

  @Patch('admin/articles/:id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    const article = await this.articlesService.updateArticle(id, dto);
    return {
      message: 'Article updated successfully',
      data: article,
    };
  }

  @Patch('admin/articles/:id/publish')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async publishArticle(@Param('id') id: string) {
    const article = await this.articlesService.publishArticle(id);
    return {
      message: 'Article published successfully',
      data: article,
    };
  }

  @Delete('admin/articles/:id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteArticle(@Param('id') id: string) {
    await this.articlesService.deleteArticle(id);
    return {
      message: 'Article deleted successfully',
    };
  }
}
