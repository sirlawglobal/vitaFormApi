import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/users.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { PlatformSettings, SettingsDocument } from './schemas/settings.schema';
import { Banner, BannerDocument } from './schemas/banner.schema';
import { CreateBannerDto, UpdateBannerDto, UpdateSettingsDto } from './dto/admin.dto';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(PlatformSettings.name) private readonly settingsModel: Model<SettingsDocument>,
    @InjectModel(Banner.name) private readonly bannerModel: Model<BannerDocument>,
  ) {}

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  async createAuditLog(logData: {
    adminId: string;
    adminEmail: string;
    action: string;
    entityType: string;
    entityId?: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogDocument> {
    return this.auditLogModel.create({
      ...logData,
      adminId: new Types.ObjectId(logData.adminId),
    });
  }

  async getAuditLogs(page = 1, limit = 20, adminId?: string): Promise<{ data: AuditLog[]; total: number }> {
    const filter: any = {};
    if (adminId) {
      filter.adminId = new Types.ObjectId(adminId);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.auditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.auditLogModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne().exec();
    if (!settings) {
      settings = await this.settingsModel.create({
        appName: 'Vitafoam Nigeria',
        contactEmail: 'support@vitafoam.com.ng',
        supportPhone: '+234700VITAFOAM',
        privacyPolicyUrl: 'https://vitafoam.com.ng/privacy',
        termsOfServiceUrl: 'https://vitafoam.com.ng/terms',
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne().exec();
    if (!settings) {
      return this.settingsModel.create(dto);
    }
    Object.assign(settings, dto);
    return settings.save();
  }

  // ── Banners ────────────────────────────────────────────────────────────────

  async createBanner(dto: CreateBannerDto): Promise<BannerDocument> {
    return this.bannerModel.create(dto);
  }

  async getBanners(activeOnly = false): Promise<BannerDocument[]> {
    const filter: any = {};
    if (activeOnly) {
      filter.isActive = true;
    }
    return this.bannerModel.find(filter).sort({ displayOrder: 1, createdAt: -1 }).exec();
  }

  async getBannerById(id: string): Promise<BannerDocument | null> {
    return this.bannerModel.findById(id).exec();
  }

  async updateBanner(id: string, dto: UpdateBannerDto): Promise<BannerDocument | null> {
    return this.bannerModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
  }

  async deleteBanner(id: string): Promise<boolean> {
    const result = await this.bannerModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // ── User Metrics & Listing ──────────────────────────────────────────────────

  async countTotalUsers(): Promise<number> {
    return this.userModel.countDocuments({ isActive: true }).exec();
  }

  async getUsers(page = 1, limit = 20, role?: string, search?: string, isActive?: boolean): Promise<{ data: User[]; total: number }> {
    const filter: any = {};
    if (role) {
      filter.role = role;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { data, total };
  }
}
