import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param } from '@nestjs/common';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { NearbyDealersDto } from './dto/nearby-dealers.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dealers')
@Controller()
export class DealersController {
  constructor(private readonly dealersService: DealersService) { }

  @ApiOperation({
    summary: 'Find real Vitafoam stores/dealers near a location via Google Places',
    description:
      'Searches Google Places for the configured brand query (default "Vitafoam") biased to the given ' +
      'coordinates. Independent of the admin-managed dealers collection below. If Google Places is not ' +
      'configured (no API key) or unreachable, transparently degrades to a small static fallback list — ' +
      'the response `source` field indicates which one was used, so every client (web, mobile, ...) sees ' +
      'identical fallback behavior without needing its own hardcoded copy.',
  })
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
      message:
        source === 'fallback'
          ? 'Nearby dealers retrieved successfully (fallback data — Google Places not configured)'
          : 'Nearby dealers retrieved successfully',
      source,
      data: dealers,
    };
  }

  // --- Admin Routes ---

  @ApiOperation({ summary: '[Admin] Register a new authorized dealer location' })
  @ApiResponse({ status: 201, description: 'Dealer registered successfully.' })
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

  @ApiOperation({ summary: '[Admin] Retrieve all registered dealer locations' })
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
