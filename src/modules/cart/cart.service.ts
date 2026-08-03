import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { ProductsRepository } from '../products/products.repository';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';
import { BusinessException } from '../../common/exceptions/business.exception';

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  primaryImage?: string;
  options?: Record<string, any>;
  addedAt: string;
}

export interface CartCalculation {
  cartId: string;
  items: CartItem[];
  itemCount: number;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  couponCode?: string;
  updatedAt: string;
}

const CART_TTL_SECONDS = 7 * 24 * 3600; // 7 days
const VAT_RATE = 0.075; // 7.5% VAT

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly productsRepository: ProductsRepository,
    private readonly outboxService: OutboxService,
  ) {}

  private getCartKey(cartId: string, isGuest = false): string {
    return isGuest ? `cart:guest:${cartId}` : `cart:${cartId}`;
  }

  async getCart(cartId: string, isGuest = false): Promise<CartCalculation> {
    const key = this.getCartKey(cartId, isGuest);
    const hashData = await this.cacheService.hgetall(key);

    const items: CartItem[] = [];
    let couponCode: string | undefined;

    if (hashData) {
      for (const [field, value] of Object.entries(hashData)) {
        if (field === '__meta_coupon') {
          couponCode = value;
        } else {
          try {
            items.push(JSON.parse(value));
          } catch (e) {
            this.logger.warn(`Failed to parse cart item [${field}] in key [${key}]`);
          }
        }
      }
    }

    return this.calculateCart(cartId, items, couponCode);
  }

  async addItem(
    cartId: string,
    dto: AddCartItemDto,
    isGuest = false,
  ): Promise<CartCalculation> {
    const product = await this.productsRepository.findBySku(dto.sku);
    if (!product || !product.isActive) {
      throw new BusinessException({
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
        message: `Product variant with SKU '${dto.sku}' not found or inactive`,
      });
    }

    const variant = product.variants?.find((v) => v.sku === dto.sku);
    if (!variant || variant.isAvailable === false) {
      throw new BusinessException({
        code: ERROR_CODES.VARIANT_NOT_FOUND,
        message: `SKU '${dto.sku}' is unavailable`,
      });
    }

    const key = this.getCartKey(cartId, isGuest);
    const existingRaw = await this.cacheService.hget(key, dto.sku);

    let currentQty = 0;
    if (existingRaw) {
      try {
        const parsed: CartItem = JSON.parse(existingRaw);
        currentQty = parsed.quantity;
      } catch (e) {
        currentQty = 0;
      }
    }

    const newQty = currentQty + dto.quantity;

    const primaryImage =
      product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;

    const item: CartItem = {
      sku: variant.sku,
      name: `${product.name} (${variant.name})`,
      price: variant.price,
      quantity: newQty,
      primaryImage,
      options: dto.options,
      addedAt: new Date().toISOString(),
    };

    await this.cacheService.hset(key, { [dto.sku]: JSON.stringify(item) });
    await this.cacheService.expire(key, CART_TTL_SECONDS);

    // Save domain event to outbox
    await this.outboxService.saveEvent({
      aggregateType: 'Cart',
      aggregateId: cartId,
      eventType: DOMAIN_EVENTS.CART_ITEM_ADDED,
      payload: { cartId, sku: dto.sku, quantity: dto.quantity, isGuest },
    });

    return this.getCart(cartId, isGuest);
  }

  async updateItem(
    cartId: string,
    sku: string,
    dto: UpdateCartItemDto,
    isGuest = false,
  ): Promise<CartCalculation> {
    const key = this.getCartKey(cartId, isGuest);
    const existingRaw = await this.cacheService.hget(key, sku);

    if (!existingRaw) {
      throw new BusinessException({
        code: ERROR_CODES.CART_ITEM_NOT_FOUND,
        message: `Cart item '${sku}' not found`,
      });
    }

    const item: CartItem = JSON.parse(existingRaw);
    item.quantity = dto.quantity;
    if (dto.options) {
      item.options = dto.options;
    }

    await this.cacheService.hset(key, { [sku]: JSON.stringify(item) });
    await this.cacheService.expire(key, CART_TTL_SECONDS);

    return this.getCart(cartId, isGuest);
  }

  async removeItem(
    cartId: string,
    sku: string,
    isGuest = false,
  ): Promise<CartCalculation> {
    const key = this.getCartKey(cartId, isGuest);
    await this.cacheService.hdel(key, sku);
    await this.cacheService.expire(key, CART_TTL_SECONDS);

    await this.outboxService.saveEvent({
      aggregateType: 'Cart',
      aggregateId: cartId,
      eventType: DOMAIN_EVENTS.CART_ITEM_REMOVED,
      payload: { cartId, sku, isGuest },
    });

    return this.getCart(cartId, isGuest);
  }

  async clearCart(cartId: string, isGuest = false): Promise<CartCalculation> {
    const key = this.getCartKey(cartId, isGuest);
    await this.cacheService.del(key);

    await this.outboxService.saveEvent({
      aggregateType: 'Cart',
      aggregateId: cartId,
      eventType: DOMAIN_EVENTS.CART_CLEARED,
      payload: { cartId, isGuest },
    });

    return this.calculateCart(cartId, []);
  }

  async applyCoupon(
    cartId: string,
    couponCode: string,
    isGuest = false,
  ): Promise<CartCalculation> {
    const cart = await this.getCart(cartId, isGuest);
    if (cart.items.length === 0) {
      throw new BusinessException({
        code: ERROR_CODES.CART_EMPTY,
        message: 'Cannot apply coupon to an empty cart',
      });
    }

    const key = this.getCartKey(cartId, isGuest);
    await this.cacheService.hset(key, { __meta_coupon: couponCode });
    await this.cacheService.expire(key, CART_TTL_SECONDS);

    return this.getCart(cartId, isGuest);
  }

  async removeCoupon(cartId: string, isGuest = false): Promise<CartCalculation> {
    const key = this.getCartKey(cartId, isGuest);
    await this.cacheService.hdel(key, '__meta_coupon');
    return this.getCart(cartId, isGuest);
  }

  async mergeGuestCart(guestSessionId: string, userId: string): Promise<CartCalculation> {
    const guestKey = this.getCartKey(guestSessionId, true);
    const userKey = this.getCartKey(userId, false);

    const [guestData, userData] = await Promise.all([
      this.cacheService.hgetall(guestKey),
      this.cacheService.hgetall(userKey),
    ]);

    if (!guestData || Object.keys(guestData).length === 0) {
      return this.getCart(userId, false);
    }

    const mergedData: Record<string, string> = { ...(userData || {}) };

    for (const [field, value] of Object.entries(guestData)) {
      if (field === '__meta_coupon') {
        if (!mergedData['__meta_coupon']) {
          mergedData['__meta_coupon'] = value;
        }
      } else {
        const guestItem: CartItem = JSON.parse(value);
        if (mergedData[field]) {
          const userItem: CartItem = JSON.parse(mergedData[field]);
          userItem.quantity += guestItem.quantity;
          mergedData[field] = JSON.stringify(userItem);
        } else {
          mergedData[field] = value;
        }
      }
    }

    await this.cacheService.hset(userKey, mergedData);
    await this.cacheService.expire(userKey, CART_TTL_SECONDS);
    await this.cacheService.del(guestKey);

    this.logger.log(`Merged guest cart [${guestSessionId}] into user cart [${userId}]`);
    return this.getCart(userId, false);
  }

  private calculateCart(
    cartId: string,
    items: CartItem[],
    couponCode?: string,
  ): CartCalculation {
    const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    let discountAmount = 0;
    if (couponCode === 'WELCOME10') {
      discountAmount = Math.round(subTotal * 0.1);
    } else if (couponCode === 'FLAT5000') {
      discountAmount = Math.min(5000, subTotal);
    }

    const taxableAmount = Math.max(0, subTotal - discountAmount);
    const taxAmount = Math.round(taxableAmount * VAT_RATE);
    const shippingFee = subTotal > 0 ? 5000 : 0;
    const totalAmount = taxableAmount + taxAmount + shippingFee;

    return {
      cartId,
      items,
      itemCount,
      subTotal,
      discountAmount,
      taxAmount,
      shippingFee,
      totalAmount,
      couponCode,
      updatedAt: new Date().toISOString(),
    };
  }
}
