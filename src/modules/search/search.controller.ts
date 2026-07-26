import { Controller, Get, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { QuerySearchDto } from './dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('autocomplete')
  async autocomplete(@Query('q') q: string) {
    if (!q) return [];
    return this.searchService.getAutocompleteSuggestions(q);
  }

  @Get('popular')
  async popular() {
    return this.searchService.getPopular(10);
  }

  @Get('history')
  @UseGuards(SessionAuthGuard)
  async getHistory(@Req() req: AuthenticatedRequest) {
    return this.searchService.getHistory(req.session.userId);
  }

  @Delete('history')
  @UseGuards(SessionAuthGuard)
  async clearHistory(@Req() req: AuthenticatedRequest) {
    await this.searchService.clearHistory(req.session.userId);
    return { success: true, message: 'Search history cleared' };
  }

  @Get()
  async search(@Query() queryDto: QuerySearchDto, @Req() req: any) {
    // Try to get userId if they are casually authenticated (for history tracking), 
    // but don't force SessionAuthGuard since search is public
    let userId: string | undefined;
    if (req.headers.authorization) {
      // In a real scenario, you might have an OptionalSessionAuthGuard
      // For now, if the session object is injected by a middleware, use it
      userId = req.session?.userId;
    }
    
    return this.searchService.searchProducts(queryDto, userId);
  }
}
