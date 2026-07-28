import { Controller, Get, Patch, Delete, Param, Query, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';

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
}
