import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, ReserveStockDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Inventory & Stock Management')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Public / Internal Endpoints ───────────────────────────────────────────

  @ApiOperation({ summary: 'Check current stock availability and warehouse for a specific SKU' })
  @ApiResponse({ status: 200, description: 'Inventory status retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'SKU not found in inventory.' })
  @Public()
  @Get('sku/:sku')
  async checkStock(@Param('sku') sku: string) {
    return this.inventoryService.checkStock(sku);
  }

  @ApiOperation({ summary: 'Reserve stock during checkout with distributed lock & optimistic check' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('reserve')
  async reserveStock(@Body() dto: ReserveStockDto) {
    return this.inventoryService.reserveStock(dto);
  }

  @ApiOperation({ summary: 'Release previously reserved stock upon cancelled or expired checkout' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('release')
  async releaseStock(@Body() dto: ReserveStockDto) {
    return this.inventoryService.releaseStock(dto);
  }

  // ── Admin Endpoints ───────────────────────────────────────────────────────

  @ApiOperation({ summary: '[Admin] Retrieve all items currently at or below their reorder point' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('low-stock')
  async getLowStock() {
    return this.inventoryService.getLowStockAdmin();
  }

  @ApiOperation({ summary: '[Admin] Manual stock intake, batch adjustment, or reconciliation' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('adjust')
  async adjustStock(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto);
  }

  @ApiOperation({ summary: '[Admin] Confirm physical stock depletion upon shipment fulfillment' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('deplete')
  async confirmStockDepletion(@Body() dto: ReserveStockDto) {
    return this.inventoryService.confirmStockDepletion(dto);
  }
}
