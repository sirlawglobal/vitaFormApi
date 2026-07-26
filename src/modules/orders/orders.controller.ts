import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Orders')
@UseGuards(SessionAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders placed by the current customer' })
  @ApiResponse({ status: 200, description: 'Paginated customer order history' })
  async getMyOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getUserOrders(
      req.session.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiOperation({ summary: 'Admin list all customer orders with filters' })
  @ApiResponse({ status: 200, description: 'Filtered admin orders list' })
  async getAdminOrders(
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getAdminFilteredOrders(
      status,
      startDate,
      endDate,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific order' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get live delivery tracking timeline for an order' })
  @ApiResponse({ status: 200, description: 'Tracking history timeline' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderTracking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderTracking(id, req.session.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (allowed only in PENDING or CONFIRMED status)' })
  @ApiResponse({ status: 200, description: 'Order cancelled and stock released' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled in its current state' })
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, req.session.userId, dto);
  }

  @Patch('admin/:id/status')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiOperation({ summary: 'Admin update order fulfillment status and tracking info' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateOrderStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const adminUser = req.session?.userId || 'admin';
    return this.ordersService.updateOrderStatus(id, dto, adminUser);
  }
}
