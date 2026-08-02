import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';
import {
  CreateBannerDto,
  CreateUserByAdminDto,
  UpdateBannerDto,
  UpdateSettingsDto,
  UpdateUserRoleDto,
  ResetUserPasswordDto,
} from './dto/admin.dto';

@ApiTags('Admin Portal')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Retrieve high-level admin dashboard overview metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics including total users, sales revenue, and low stock count' })
  async getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all registered platform users with search, role, and pagination filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role: customer, admin, support, dealer' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search name, email, or phone' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Paginated user accounts list' })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.adminService.getUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      role,
      search,
      isActive !== undefined ? String(isActive) === 'true' : undefined,
    );
  }

  @Post('users')
  @ApiOperation({ summary: 'Manually provision a staff or admin user account' })
  @ApiResponse({ status: 201, description: 'User account provisioned successfully' })
  async createUserByAdmin(
    @Body() dto: CreateUserByAdminDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.createUserByAdmin(dto, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Promote or modify user role and security permissions' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateUserRole(id, dto, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Patch('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset a user password manually' })
  @ApiResponse({ status: 200, description: 'User password updated' })
  async resetUserPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.resetUserPassword(id, dto, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Permanently delete a user account' })
  @ApiResponse({ status: 200, description: 'User account permanently deleted' })
  async deleteUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.deleteUser(id, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs of administrative actions for security compliance' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'adminId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('adminId') adminId?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      adminId,
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get global platform settings and branding configurations' })
  @ApiResponse({ status: 200, description: 'Platform settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update global platform settings and maintenance mode' })
  @ApiResponse({ status: 200, description: 'Updated platform settings' })
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateSettings(dto, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create a new homepage promotional banner' })
  @ApiResponse({ status: 201, description: 'Banner created' })
  async createBanner(
    @Body() dto: CreateBannerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.createBanner(dto, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Get('banners')
  @ApiOperation({ summary: 'List all promotional banners' })
  @ApiResponse({ status: 200, description: 'List of banners' })
  async getBanners() {
    return this.adminService.getBanners(false);
  }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Get details of a specific promotional banner' })
  @ApiResponse({ status: 200, description: 'Banner details' })
  async getBannerById(@Param('id') id: string) {
    return this.adminService.getBannerById(id);
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Edit or reorder an existing promotional banner' })
  @ApiResponse({ status: 200, description: 'Banner updated' })
  async updateBanner(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateBanner(id, dto, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a promotional banner' })
  @ApiResponse({ status: 200, description: 'Banner deleted' })
  async deleteBanner(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.deleteBanner(id, {
      userId: req.session.userId,
      email: req.session.email || 'admin@vitafoam.com',
    });
  }
}
