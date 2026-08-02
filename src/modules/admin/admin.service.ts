import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AdminRepository } from './admin.repository';
import { User } from '../users/users.schema';
import { Order } from '../orders/orders.schema';
import { Inventory } from '../inventory/inventory.schema';
import { Role } from '../../common/enums/role.enum';
import { ROLE_PERMISSIONS } from '../../common/constants/permissions.constants';
import { CreateBannerDto, CreateUserByAdminDto, UpdateBannerDto, UpdateSettingsDto, UpdateUserRoleDto, ResetUserPasswordDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
  ) {}

  // ── Dashboard Overview ─────────────────────────────────────────────────────

  async getDashboardOverview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalOrders,
      ordersToday,
      lowStockDocs,
      revenueResult,
      revenueTodayResult,
    ] = await Promise.all([
      this.adminRepository.countTotalUsers(),
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ createdAt: { $gte: startOfToday } }).exec(),
      this.inventoryModel.find({ $expr: { $lte: ['$quantity', '$reorderPoint'] } }).exec(),
      this.orderModel.aggregate([
        { $match: { orderStatus: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$paymentSummary.total' } } },
      ]).exec(),
      this.orderModel.aggregate([
        { $match: { orderStatus: { $ne: 'CANCELLED' }, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$paymentSummary.total' } } },
      ]).exec(),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const revenueToday = revenueTodayResult[0]?.total || 0;

    return {
      totalUsers,
      totalOrders,
      ordersToday,
      totalRevenue,
      revenueToday,
      lowStockProductsCount: lowStockDocs.length,
      activeDealers: 0,
      pendingWarranties: 0,
    };
  }

  // ── User Scaffolding & Role Management ────────────────────────────────────

  async getUsers(page = 1, limit = 20, role?: string, search?: string, isActive?: boolean) {
    return this.adminRepository.getUsers(page, limit, role, search, isActive);
  }

  async createUserByAdmin(dto: CreateUserByAdminDto, adminUser: { userId: string; email: string }) {
    const existing = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { phone: dto.phone }],
    });
    if (existing) {
      throw new BadRequestException('User with given email or phone already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser = await this.userModel.create({
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      permissions: ROLE_PERMISSIONS[dto.role] || [],
      isVerified: true,
      isActive: true,
    });

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: (newUser._id as any).toString(),
      changes: { role: dto.role, email: dto.email },
    });

    const userObj = newUser.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, adminUser: { userId: string; email: string }) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const previousRole = user.role;
    user.role = dto.role;
    user.permissions = ROLE_PERMISSIONS[dto.role] || [];
    await user.save();

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'UPDATE_USER_ROLE',
      entityType: 'User',
      entityId: id,
      changes: { before: { role: previousRole }, after: { role: dto.role } },
    });

    return {
      userId: id,
      previousRole,
      newRole: dto.role,
      updatedAt: new Date().toISOString(),
    };
  }

  async resetUserPassword(id: string, dto: ResetUserPasswordDto, adminUser: { userId: string; email: string }) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    user.passwordHash = passwordHash;
    await user.save();

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'RESET_USER_PASSWORD',
      entityType: 'User',
      entityId: id,
      changes: { message: 'Password was manually reset by admin' },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  async deleteUser(id: string, adminUser: { userId: string; email: string }) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userModel.findByIdAndDelete(id);

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      changes: { email: user.email, role: user.role },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  async getAuditLogs(page = 1, limit = 20, adminId?: string) {
    return this.adminRepository.getAuditLogs(page, limit, adminId);
  }

  // ── Platform Settings ──────────────────────────────────────────────────────

  async getSettings() {
    return this.adminRepository.getSettings();
  }

  async updateSettings(dto: UpdateSettingsDto, adminUser: { userId: string; email: string }) {
    const before = await this.adminRepository.getSettings();
    const updated = await this.adminRepository.updateSettings(dto);

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'UPDATE_SETTINGS',
      entityType: 'PlatformSettings',
      entityId: (updated._id as any).toString(),
      changes: { before: before.toObject(), after: updated.toObject() },
    });

    return updated;
  }

  // ── Homepage Banners ──────────────────────────────────────────────────────

  async createBanner(dto: CreateBannerDto, adminUser: { userId: string; email: string }) {
    const banner = await this.adminRepository.createBanner(dto);

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'CREATE_BANNER',
      entityType: 'Banner',
      entityId: (banner._id as any).toString(),
      changes: { title: dto.title },
    });

    return banner;
  }

  async getBanners(activeOnly = false) {
    return this.adminRepository.getBanners(activeOnly);
  }

  async getBannerById(id: string) {
    const banner = await this.adminRepository.getBannerById(id);
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async updateBanner(id: string, dto: UpdateBannerDto, adminUser: { userId: string; email: string }) {
    const before = await this.adminRepository.getBannerById(id);
    if (!before) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const updated = await this.adminRepository.updateBanner(id, dto);

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'UPDATE_BANNER',
      entityType: 'Banner',
      entityId: id,
      changes: { before: before.toObject(), after: updated?.toObject() },
    });

    return updated;
  }

  async deleteBanner(id: string, adminUser: { userId: string; email: string }) {
    const before = await this.adminRepository.getBannerById(id);
    if (!before) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    await this.adminRepository.deleteBanner(id);

    await this.adminRepository.createAuditLog({
      adminId: adminUser.userId,
      adminEmail: adminUser.email,
      action: 'DELETE_BANNER',
      entityType: 'Banner',
      entityId: id,
      changes: { title: before.title },
    });

    return { success: true, message: 'Banner deleted successfully' };
  }
}
