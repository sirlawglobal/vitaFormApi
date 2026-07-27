import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { TrackAnalyticsEventDto } from './dto/analytics.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Analytics & Retargeting')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest high-speed user clickstream interaction event' })
  @ApiResponse({ status: 200, description: 'Event queued for batch insertion' })
  async trackEvent(@Body() dto: TrackAnalyticsEventDto, @Req() req: any) {
    const session = req.session;
    return this.analyticsService.trackEvent(dto, {
      userId: session?.userId,
      email: session?.email,
      phone: session?.phone,
    });
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('dashboard')
  @ApiOperation({ summary: 'Retrieve analytics chart data grouped by day, week, or month' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Analytics chart data' })
  async getDashboardMetrics(@Query('groupBy') groupBy?: 'day' | 'week' | 'month') {
    return this.analyticsService.getDashboardMetrics(groupBy || 'day');
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('funnel')
  @ApiOperation({ summary: 'Retrieve checkout conversion funnel drop-off analytics' })
  @ApiResponse({ status: 200, description: 'Funnel metrics' })
  async getFunnelMetrics() {
    return this.analyticsService.getFunnelMetrics();
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('abandoned-carts')
  @ApiOperation({ summary: 'List abandoned shopping carts for marketing follow-up and retargeting' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of abandoned cart users with emails and phone numbers' })
  async getAbandonedCarts(@Query('limit') limit?: number) {
    return this.analyticsService.getAbandonedCarts(limit ? Number(limit) : 50);
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users/:userId/activity')
  @ApiOperation({ summary: 'View detailed clickstream activity timeline for a specific customer' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User activity timeline' })
  async getUserActivityTimeline(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getUserActivityTimeline(userId, limit ? Number(limit) : 50);
  }
}
