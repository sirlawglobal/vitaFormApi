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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Articles (Blog)')
@Controller()
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @ApiOperation({ summary: 'Retrieve list of published articles with pagination & optional tag filter' })
  @ApiResponse({ status: 200, description: 'Published articles retrieved successfully.' })
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

  @ApiOperation({ summary: 'Retrieve single published article by URL slug' })
  @ApiResponse({ status: 200, description: 'Article detail retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
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

  @ApiOperation({ summary: '[Admin] List all articles including drafts & published' })
  @ApiResponse({ status: 200, description: 'Articles list retrieved successfully.' })
  @ApiBearerAuth()
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

  @ApiOperation({ summary: '[Admin] Create a new draft article' })
  @ApiResponse({ status: 201, description: 'Article draft created successfully.' })
  @ApiBearerAuth()
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

  @ApiOperation({ summary: '[Admin] Update article details' })
  @ApiResponse({ status: 200, description: 'Article updated successfully.' })
  @ApiBearerAuth()
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

  @ApiOperation({ summary: '[Admin] Publish an article' })
  @ApiResponse({ status: 200, description: 'Article published successfully.' })
  @ApiBearerAuth()
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

  @ApiOperation({ summary: '[Admin] Delete an article' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully.' })
  @ApiBearerAuth()
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
