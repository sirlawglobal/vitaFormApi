import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { Public } from '../../common/decorators/public.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
  ) {}

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get personalized product recommendations for logged-in user' })
  @ApiResponse({ status: 200, description: 'Personalized recommendations' })
  async getMyRecommendations(@Req() req: AuthenticatedRequest) {
    return this.recommendationService.getUserRecommendations(req.session.userId);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Get overall popular catalog recommendations' })
  @ApiResponse({ status: 200, description: 'Popular products' })
  async getPopular(@Query('limit') limit?: number) {
    return this.recommendationService.getPopularRecommendations(limit ? Number(limit) : 6);
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get community trending products' })
  @ApiResponse({ status: 200, description: 'Trending products' })
  async getTrending(@Query('limit') limit?: number) {
    return this.recommendationService.getTrendingRecommendations(limit ? Number(limit) : 6);
  }
}
