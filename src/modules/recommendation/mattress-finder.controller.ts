import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Mattress Finder')
@Controller('mattress-finder')
export class MattressFinderController {
  constructor(
    private readonly recommendationService: RecommendationService,
  ) {}

  @Public()
  @Get('options')
  @ApiOperation({ summary: 'Get available filter options for Mattress Finder' })
  @ApiResponse({ status: 200, description: 'Mattress filter options' })
  getOptions() {
    return {
      firmnessOptions: ['soft', 'medium', 'firm', 'extra-firm'],
      sizes: ['Single', 'Double', 'Queen', 'King', 'Super King'],
      priceRanges: [
        { label: 'Under ₦150,000', max: 150000 },
        { label: '₦150,000 - ₦300,000', min: 150000, max: 300000 },
        { label: 'Above ₦300,000', min: 300000 },
      ],
    };
  }

  @Public()
  @Post('query')
  @ApiOperation({ summary: 'Query mattress catalog using quick filters' })
  @ApiResponse({ status: 200, description: 'Filtered mattresses' })
  async queryMattressFinder(
    @Body() body: { firmness?: string; size?: string; maxPrice?: number },
  ) {
    return this.recommendationService.queryMattressFinder(body);
  }
}
