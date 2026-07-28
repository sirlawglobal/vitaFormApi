import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param } from '@nestjs/common';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Dealers')
@Controller('api/v1')
export class DealersController {
  constructor(private readonly dealersService: DealersService) {}

  @Get('dealers/nearby')
  async getNearbyDealers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 20; // Default 20km

    const dealers = await this.dealersService.getNearbyDealers(latNum, lngNum, radiusKm);
    return {
      message: 'Nearby dealers retrieved successfully',
      data: dealers,
    };
  }

  // --- Admin Routes ---

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
