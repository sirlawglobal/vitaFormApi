import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import { RegisterWarrantyDto } from './dto/register-warranty.dto';
import { FileClaimDto } from './dto/file-claim.dto';
import { ModerateClaimDto } from './dto/moderate-claim.dto';
import { QueryWarrantyDto } from './dto/query-warranty.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedRequest } from '../../common/types/session.types';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Warranty')
@Controller('api/v1')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post('warranty/register')
  @UseGuards(SessionAuthGuard)
  async registerWarranty(@Req() req: AuthenticatedRequest, @Body() dto: RegisterWarrantyDto) {
    const warranty = await this.warrantyService.registerWarranty(req.session.userId, dto);
    return {
      message: 'Warranty registered successfully',
      data: warranty,
    };
  }

  @Get('warranty/me')
  @UseGuards(SessionAuthGuard)
  async getMyWarranties(@Req() req: AuthenticatedRequest, @Query() query: QueryWarrantyDto) {
    const { data, total } = await this.warrantyService.getMyWarranties(req.session.userId, query.page, query.limit);
    return {
      message: 'Warranties retrieved successfully',
      data,
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  @Get('warranty/:id')
  @UseGuards(SessionAuthGuard)
  async getWarrantyDetails(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const warranty = await this.warrantyService.getWarrantyDetails(id, req.session.userId);
    return {
      message: 'Warranty details retrieved',
      data: warranty,
    };
  }

  @Post('warranty/:id/claim')
  @UseGuards(SessionAuthGuard)
  async fileClaim(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: FileClaimDto,
  ) {
    const updated = await this.warrantyService.fileClaim(req.session.userId, id, dto.description, dto.images || []);
    return {
      message: 'Warranty claim submitted successfully',
      data: updated,
    };
  }

  // --- Admin Routes ---

  @Get('admin/warranty/claims')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllClaims(@Query() query: QueryWarrantyDto) {
    const { data, total } = await this.warrantyService.getAllClaims(query.page || 1, query.limit || 20);
    return {
      message: 'Warranty claims retrieved successfully',
      data,
      meta: { page: query.page || 1, limit: query.limit || 20, total },
    };
  }

  @Patch('admin/warranty/:warrantyId/claims/:claimId')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async moderateClaim(
    @Param('warrantyId') warrantyId: string,
    @Param('claimId') claimId: string,
    @Body() dto: ModerateClaimDto,
  ) {
    const updated = await this.warrantyService.moderateClaim(warrantyId, claimId, dto.status, dto.resolution);
    return {
      message: 'Warranty claim moderated successfully',
      data: updated,
    };
  }
}
