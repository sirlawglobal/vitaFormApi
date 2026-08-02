import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/promotions.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Promotions & Coupons')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate promotional discount coupon code for customer cart' })
  @ApiResponse({ status: 200, description: 'Coupon is valid and calculated discount amount returned' })
  @ApiResponse({ status: 400, description: 'Coupon is expired, inactive, or invalid' })
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.promotionsService.validateCoupon(dto);
  }

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'List all currently active public promotional deals and coupons' })
  @ApiResponse({ status: 200, description: 'Active promotions list' })
  async getActivePromotions() {
    return this.promotionsService.getActivePromotions();
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new promotional discount coupon code' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.promotionsService.createCoupon(dto);
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List all coupons with usage statistics, pagination, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'All coupons list paginated' })
  async getAllCoupons(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.promotionsService.getAllCoupons(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      search,
      isActive !== undefined ? String(isActive) === 'true' : undefined,
    );
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get details and usage statistics for a specific coupon' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  async getCouponById(@Param('id') id: string) {
    return this.promotionsService.getCouponById(id);
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Edit or deactivate an existing coupon code' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.promotionsService.updateCoupon(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a promotional coupon code' })
  @ApiResponse({ status: 200, description: 'Coupon deleted' })
  async deleteCoupon(@Param('id') id: string) {
    return this.promotionsService.deleteCoupon(id);
  }
}
