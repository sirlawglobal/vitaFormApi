import { Controller, Get, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { QuerySearchDto } from './dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Search Engine')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('autocomplete')
  @ApiOperation({ summary: 'Sub-50ms instant prefix search autocomplete suggestions' })
  @ApiQuery({ name: 'q', example: 'ortho', description: 'Search prefix query string' })
  @ApiResponse({ status: 200, description: 'Autocomplete search suggestions list' })
  async autocomplete(@Query('q') q: string) {
    if (!q) return [];
    return this.searchService.getAutocompleteSuggestions(q);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Get top 10 most popular search terms' })
  @ApiResponse({ status: 200, description: 'Popular search terms' })
  async popular() {
    return this.searchService.getPopular(10);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Get('history')
  @ApiOperation({ summary: 'Get recent search query history for authenticated user' })
  @ApiResponse({ status: 200, description: 'User search history list' })
  async getHistory(@Req() req: AuthenticatedRequest) {
    return this.searchService.getHistory(req.session.userId);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Delete('history')
  @ApiOperation({ summary: 'Clear search query history for authenticated user' })
  @ApiResponse({ status: 200, description: 'Search history cleared successfully' })
  async clearHistory(@Req() req: AuthenticatedRequest) {
    await this.searchService.clearHistory(req.session.userId);
    return { success: true, message: 'Search history cleared' };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Execute full-text catalog search with filters' })
  @ApiResponse({ status: 200, description: 'Search results payload' })
  async search(@Query() queryDto: QuerySearchDto, @Req() req: any) {
    let userId: string | undefined;
    if (req.session?.userId) {
      userId = req.session.userId;
    }
    return this.searchService.searchProducts(queryDto, userId);
  }
}
