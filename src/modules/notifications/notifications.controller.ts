import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedRequest } from '../../common/types/session.types';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('In-App Notifications')
@Controller('api/v1/notifications')
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(@Req() req: AuthenticatedRequest, @Query() query: QueryNotificationsDto) {
    const { data, total } = await this.notificationsService.listForUser(req.session.userId, query.page, query.limit);
    return {
      message: 'Notifications retrieved successfully',
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(req.session.userId);
    return {
      message: 'Unread notifications count retrieved',
      data: { count },
    };
  }

  @Patch('read-all')
  async markAllRead(@Req() req: AuthenticatedRequest) {
    const modifiedCount = await this.notificationsService.markAllRead(req.session.userId);
    return {
      message: 'All notifications marked as read',
      data: { modifiedCount },
    };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const notification = await this.notificationsService.markRead(id, req.session.userId);
    if (!notification) {
      throw new NotFoundException('Notification not found or not owned by user');
    }
    return {
      message: 'Notification marked as read',
      data: notification,
    };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const deleted = await this.notificationsService.delete(id, req.session.userId);
    if (!deleted) {
      throw new NotFoundException('Notification not found or not owned by user');
    }
    return {
      message: 'Notification deleted successfully',
    };
  }

  @Post('admin/broadcast')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin broadcast push notification to all eligible users' })
  @ApiResponse({ status: 201, description: 'Broadcast sent successfully' })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    const type = dto.type || ('PROMO' as any);
    const result = await this.notificationsService.broadcast(type, dto.title, dto.body);
    return {
      message: 'Broadcast notification initiated',
      data: result,
    };
  }
}
