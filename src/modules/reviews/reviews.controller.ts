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
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('api/v1')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // --- Public / Customer Routes ---

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
