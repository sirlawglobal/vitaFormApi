import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param } from '@nestjs/common';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { NearbyDealersDto } from './dto/nearby-dealers.dto';
import { SearchDealersDto } from './dto/search-dealers.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

function fallbackAwareMessage(source: 'database' | 'fallback', successMessage: string): string {
  return source === 'fallback'
    ? `${successMessage} (fallback data — no dealers onboarded yet)`
    : successMessage;
}

@ApiTags('Dealers')
@Controller()
export class DealersController {
  constructor(private readonly dealersService: DealersService) { }

  @ApiOperation({ summary: 'List all Vitafoam dealers/stores' })
  @ApiResponse({ status: 200, description: 'Dealers retrieved successfully.' })
  @Public()
  @Get('dealers')
  async listDealers() {
    const { source, dealers } = await this.dealersService.getPublicDealers();
    return {
      message: fallbackAwareMessage(source, 'Dealers retrieved successfully'),
      source,
      data: dealers,
    };
  }

  @ApiOperation({ summary: 'Find nearby Vitafoam dealers by latitude & longitude' })
  @ApiResponse({ status: 200, description: 'Nearby dealers retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'lat/lng missing, out of range, or radius exceeds 200km.' })
  @Public()
  @Get('dealers/nearby')
  async getNearbyDealers(@Query() query: NearbyDealersDto) {
    const { source, dealers } = await this.dealersService.getNearbyDealers(
      query.lat,
      query.lng,
      query.radius ?? 20,
    );
    return {
      message: fallbackAwareMessage(source, 'Nearby dealers retrieved successfully'),
      source,
      data: dealers,
    };
  }

  @ApiOperation({
    summary: 'Find Vitafoam dealers in a named city/state',
    description:
      'Searches by city/state/address text, independent of the caller\'s own location — ' +
      'e.g. a user in Lagos can search "Enugu" to see dealers there.',
  })
  @ApiResponse({ status: 200, description: 'Dealers retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'location query param missing or too short.' })
  @Public()
  @Get('dealers/search')
  async searchDealers(@Query() query: SearchDealersDto) {
    const { source, dealers } = await this.dealersService.searchDealersByLocation(query.location);
    return {
      message: fallbackAwareMessage(source, 'Dealers retrieved successfully'),
      source,
      data: dealers,
    };
  }

  // --- Admin Routes ---

  @ApiOperation({ summary: '[Admin] Onboard a new authorized dealer location' })
  @ApiResponse({ status: 201, description: 'Dealer created successfully.' })
  @ApiBearerAuth()
  @Post('admin/dealers')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createDealer(@Body() dto: CreateDealerDto) {
    const dealer = await this.dealersService.createDealer(dto);
    return {
      message: 'Dealer created successfully',
      data: dealer,
    };
  }

  @ApiOperation({ summary: '[Admin] Retrieve all registered dealer locations (including inactive)' })
  @ApiResponse({ status: 200, description: 'Dealers retrieved successfully.' })
  @ApiBearerAuth()
  @Get('admin/dealers')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllDealers() {
    const dealers = await this.dealersService.getAllDealers();
    return {
      message: 'Dealers retrieved successfully',
      data: dealers,
    };
  }

  @ApiOperation({ summary: '[Admin] Update dealer location details' })
  @ApiResponse({ status: 200, description: 'Dealer updated successfully.' })
  @ApiBearerAuth()
  @Patch('admin/dealers/:id')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateDealer(@Param('id') id: string, @Body() dto: Partial<CreateDealerDto>) {
    const dealer = await this.dealersService.updateDealer(id, dto);
    return {
      message: 'Dealer updated successfully',
      data: dealer,
    };
  }
}
