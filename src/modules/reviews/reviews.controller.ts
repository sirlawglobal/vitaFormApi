import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ModerateReviewDto, RejectReviewDto } from './dto/moderate-review.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedRequest } from '../../common/types/session.types';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // --- Public / Customer Routes ---

  @ApiOperation({ summary: 'Retrieve approved customer reviews for a specific product' })
  @ApiResponse({ status: 200, description: 'Product reviews retrieved successfully.' })
  @Public()
  @Get('reviews/products/:productId')
  async getProductReviews(@Param('productId') productId: string, @Query() query: QueryReviewsDto) {
    const { data, total, aggregation } = await this.reviewsService.getProductReviews(productId, query.page, query.limit);
    return {
      message: 'Product reviews retrieved successfully',
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        aggregation,
      },
    };
  }

  @ApiOperation({ summary: 'Submit a new customer review for a product' })
  @ApiResponse({ status: 201, description: 'Review submitted successfully.' })
  @ApiBearerAuth()
  @Post('reviews/products/:productId')
  @UseGuards(SessionAuthGuard)
  async submitReview(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.reviewsService.submitReview(req.session.userId, productId, dto);
    return {
      message: 'Review submitted successfully',
      data: review,
    };
  }

  @ApiOperation({ summary: 'Retrieve reviews submitted by the current authenticated user' })
  @ApiResponse({ status: 200, description: 'User reviews retrieved successfully.' })
  @ApiBearerAuth()
  @Get('reviews/me')
  @UseGuards(SessionAuthGuard)
  async getMyReviews(@Req() req: AuthenticatedRequest, @Query() query: QueryReviewsDto) {
    const { data, total } = await this.reviewsService.getMyReviews(req.session.userId, query.page, query.limit);
    return {
      message: 'Your reviews retrieved successfully',
      data,
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  @ApiOperation({ summary: 'Upvote a helpful product review' })
  @ApiResponse({ status: 200, description: 'Review marked as helpful.' })
  @ApiBearerAuth()
  @Post('reviews/:id/helpful')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markHelpful(@Param('id') id: string) {
    const review = await this.reviewsService.markHelpful(id);
    return {
      message: 'Review marked as helpful',
      data: review,
    };
  }

  // --- Admin Routes ---

  @ApiOperation({ summary: '[Admin] List pending reviews awaiting moderation' })
  @ApiResponse({ status: 200, description: 'Pending reviews retrieved successfully.' })
  @ApiBearerAuth()
  @Get('admin/reviews')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async listPendingReviews(@Query() query: QueryReviewsDto) {
    const { data, total } = await this.reviewsService.listPendingReviews(query.page, query.limit);
    return {
      message: 'Pending reviews retrieved successfully',
      data,
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  @ApiOperation({ summary: '[Admin] Approve a customer review for publication' })
  @ApiResponse({ status: 200, description: 'Review approved successfully.' })
  @ApiBearerAuth()
  @Patch('admin/reviews/:id/approve')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async approveReview(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    const review = await this.reviewsService.approveReview(id, dto.adminNote);
    return {
      message: 'Review approved successfully',
      data: review,
    };
  }

  @ApiOperation({ summary: '[Admin] Reject a customer review' })
  @ApiResponse({ status: 200, description: 'Review rejected successfully.' })
  @ApiBearerAuth()
  @Patch('admin/reviews/:id/reject')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async rejectReview(@Param('id') id: string, @Body() dto: RejectReviewDto) {
    const review = await this.reviewsService.rejectReview(id, dto.adminNote);
    return {
      message: 'Review rejected successfully',
      data: review,
    };
  }
}
