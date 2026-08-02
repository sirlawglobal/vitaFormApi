import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema';
import { CreateCouponDto, UpdateCouponDto } from './dto/promotions.dto';

@Injectable()
export class PromotionsRepository {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  async createCoupon(dto: CreateCouponDto): Promise<CouponDocument> {
    return this.couponModel.create({
      ...dto,
      code: dto.code.toUpperCase(),
      startDate: new Date(dto.startDate),
      expiresAt: new Date(dto.expiresAt),
    });
  }

  async findByCode(code: string): Promise<CouponDocument | null> {
    return this.couponModel.findOne({ code: code.toUpperCase() }).exec();
  }

  async findActiveCoupons(): Promise<CouponDocument[]> {
    const now = new Date();
    return this.couponModel
      .find({
        isActive: true,
        startDate: { $lte: now },
        expiresAt: { $gte: now },
      })
      .exec();
  }

  async findAllCoupons(page = 1, limit = 20, search?: string, isActive?: boolean): Promise<{ data: CouponDocument[]; total: number }> {
    const filter: any = {};
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.couponModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.couponModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<CouponDocument | null> {
    return this.couponModel.findById(id).exec();
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponDocument | null> {
    const updateData: any = { ...dto };
    if (dto.code) updateData.code = dto.code.toUpperCase();
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.expiresAt) updateData.expiresAt = new Date(dto.expiresAt);

    return this.couponModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await this.couponModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async incrementUsage(id: string): Promise<void> {
    await this.couponModel.findByIdAndUpdate(id, { $inc: { usedCount: 1 } }).exec();
  }
}
