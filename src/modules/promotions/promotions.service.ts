import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PromotionsRepository } from './promotions.repository';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { DiscountType } from './schemas/coupon.schema';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/promotions.dto';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly promotionsRepository: PromotionsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async validateCoupon(dto: ValidateCouponDto) {
    const codeUpper = dto.code.trim().toUpperCase();
    const cacheKey = `vitaform:coupon:${codeUpper}`;

    // High-speed Redis validation check
    let coupon = await this.cacheService.get<any>(cacheKey);
    if (!coupon) {
      const couponDoc = await this.promotionsRepository.findByCode(codeUpper);
      if (!couponDoc) {
        throw new BadRequestException(`Coupon code '${codeUpper}' is invalid or does not exist`);
      }
      coupon = couponDoc.toObject();
      await this.cacheService.set(cacheKey, coupon, 300); // 5 min TTL
    }

    const now = new Date();
    if (!coupon.isActive) {
      throw new BadRequestException(`Coupon code '${codeUpper}' is currently inactive`);
    }

    if (new Date(coupon.startDate) > now) {
      throw new BadRequestException(`Coupon code '${codeUpper}' is not yet active`);
    }

    if (new Date(coupon.expiresAt) < now) {
      throw new BadRequestException(`Coupon code '${codeUpper}' has expired`);
    }

    if (coupon.usageLimitTotal > 0 && coupon.usedCount >= coupon.usageLimitTotal) {
      throw new BadRequestException(`Coupon code '${codeUpper}' has reached its total usage limit`);
    }

    if (coupon.minOrderAmount > 0 && dto.cartTotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Cart total must be at least ₦${coupon.minOrderAmount.toLocaleString()} to use this coupon`,
      );
    }

    // Check product-specific targeting
    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      const cartProductIds = dto.productIds || [];
      const hasTargetProduct = cartProductIds.some((pId) =>
        coupon.applicableProductIds.includes(pId),
      );
      if (!hasTargetProduct) {
        throw new BadRequestException(
          `Coupon code '${codeUpper}' is only applicable to specific products`,
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (dto.cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    if (discountAmount > dto.cartTotal) {
      discountAmount = dto.cartTotal;
    }

    const finalTotal = dto.cartTotal - discountAmount;

    return {
      valid: true,
      code: codeUpper,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalTotal,
      message: `Coupon applied successfully! Saved ₦${discountAmount.toLocaleString()}`,
    };
  }

  async createCoupon(dto: CreateCouponDto) {
    const existing = await this.promotionsRepository.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException(`Coupon code '${dto.code.toUpperCase()}' already exists`);
    }

    const coupon = await this.promotionsRepository.createCoupon(dto);
    await this.cacheService.del(`vitaform:coupon:${dto.code.toUpperCase()}`);
    return coupon;
  }

  async getActivePromotions() {
    return this.promotionsRepository.findActiveCoupons();
  }

  async getAllCoupons(page = 1, limit = 20, search?: string, isActive?: boolean) {
    return this.promotionsRepository.findAllCoupons(page, limit, search, isActive);
  }

  async getCouponById(id: string) {
    const coupon = await this.promotionsRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return coupon;
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const before = await this.promotionsRepository.findById(id);
    if (!before) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    const updated = await this.promotionsRepository.updateCoupon(id, dto);
    if (before.code) {
      await this.cacheService.del(`vitaform:coupon:${before.code.toUpperCase()}`);
    }
    if (dto.code) {
      await this.cacheService.del(`vitaform:coupon:${dto.code.toUpperCase()}`);
    }

    return updated;
  }

  async deleteCoupon(id: string) {
    const coupon = await this.promotionsRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    await this.promotionsRepository.deleteCoupon(id);
    await this.cacheService.del(`vitaform:coupon:${coupon.code.toUpperCase()}`);

    return { success: true, message: `Coupon '${coupon.code}' deleted successfully` };
  }
}
