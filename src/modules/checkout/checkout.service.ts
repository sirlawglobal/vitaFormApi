import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { UsersRepository } from '../users/users.repository';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';
import { CalculateFeesDto } from './dto/calculate-fees.dto';
import { InitiateCheckoutDto } from './dto/initiate-checkout.dto';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';
import { BusinessException } from '../../common/exceptions/business.exception';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

export interface CheckoutInitiateResult {
  checkoutRef: string;
  userId: string;
  items: any[];
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  shippingAddress: any;
  paymentMethod: string;
  notes?: string;
  expiresAt: string;
  orderId?: string;
  orderNumber?: string;
  paymentUrl?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly cartService: CartService,
    private readonly usersRepository: UsersRepository,
    private readonly cacheService: CacheService,
    private readonly outboxService: OutboxService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async calculateFees(userId: string, dto: CalculateFeesDto) {
    const cart = await this.cartService.getCart(userId, false);
    if (cart.items.length === 0) {
      throw new BusinessException({
        code: ERROR_CODES.CART_EMPTY,
        message: 'Cannot calculate fees for an empty cart',
      });
    }

    let shippingAddress = null;
    if (dto.shippingAddressId) {
      shippingAddress = await this.validateAddress(userId, dto.shippingAddressId);
    }

    return {
      subTotal: cart.subTotal,
      discountAmount: cart.discountAmount,
      taxAmount: cart.taxAmount,
      shippingFee: cart.shippingFee,
      totalAmount: cart.totalAmount,
      shippingAddress,
      itemCount: cart.itemCount,
    };
  }

  async validateAddress(userId: string, addressId: string): Promise<any> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetAddress = user.addresses?.find(
      (a: any) => a._id && a._id.toString() === addressId,
    );

    if (!targetAddress) {
      throw new NotFoundException(`Delivery address '${addressId}' not found on user profile`);
    }

    return targetAddress;
  }

  async initiateCheckout(
    userId: string,
    dto: InitiateCheckoutDto,
  ): Promise<CheckoutInitiateResult> {
    // 1. Get user cart
    const cart = await this.cartService.getCart(userId, false);
    if (cart.items.length === 0) {
      throw new BusinessException({
        code: ERROR_CODES.CART_EMPTY,
        message: 'Cannot initiate checkout with an empty cart',
      });
    }

    // 2. Validate Shipping Address
    const shippingAddress = await this.validateAddress(userId, dto.shippingAddressId);

    // 3. Acquire Distributed SKU Lock via setNx (preventing race condition flash sales)
    const acquiredLocks: string[] = [];
    try {
      for (const item of cart.items) {
        const lockKey = `vitaform:lock:inventory:${item.sku}`;
        const acquired = await this.cacheService.setNx(lockKey, userId, 30); // 30s TTL
        if (!acquired) {
          throw new BusinessException({
            code: ERROR_CODES.INVENTORY_BUSY,
            message: `SKU '${item.sku}' is currently being checked out by another customer. Please retry.`,
          });
        }
        acquiredLocks.push(lockKey);
      }

      // 4. Generate unique checkout reference
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const checkoutRef = `CHK-${new Date().getFullYear()}-${randomCode}-${Date.now().toString().slice(-4)}`;

      const checkoutPayload: CheckoutInitiateResult = {
        checkoutRef,
        userId,
        items: cart.items,
        subTotal: cart.subTotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        shippingFee: cart.shippingFee,
        totalAmount: cart.totalAmount,
        shippingAddress,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min window
      };

      const user = await this.usersRepository.findById(userId);
      const userDetails = user
        ? {
            userId: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          }
        : { userId };

      // 5. Save CheckoutInitiated event to Outbox with rich user & address details
      await this.outboxService.saveEvent({
        aggregateType: 'Checkout',
        aggregateId: checkoutRef,
        eventType: DOMAIN_EVENTS.CHECKOUT_INITIATED,
        payload: {
          checkoutRef,
          userId,
          user: userDetails,
          totalAmount: cart.totalAmount,
          subTotal: cart.subTotal,
          discountAmount: cart.discountAmount,
          itemCount: cart.itemCount,
          paymentMethod: dto.paymentMethod,
          shippingAddress,
        },
      });

      // 6. Create Order synchronously in database
      const order = await this.ordersService.createOrderFromCheckout(userId, checkoutPayload);

      // 7. Initialize Payment Session synchronously
      const userEmail = user?.email || 'customer@vitafoam.com';
      const paymentInit = await this.paymentsService.initializePayment(
        userId,
        {
          checkoutRef,
          provider: dto.paymentMethod,
        },
        userEmail,
      );
      const paymentUrl = paymentInit.authorizationUrl;

      // 8. Clear Redis Cart upon successful checkout initiation
      await this.cartService.clearCart(userId, false);

      this.logger.log(`Checkout initiated and Order created [${order.orderNumber}] for user [${userId}]`);
      return {
        ...checkoutPayload,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        paymentUrl,
      };
    } finally {
      // Release distributed SKU locks
      for (const lockKey of acquiredLocks) {
        await this.cacheService.del(lockKey);
      }
    }
  }
}
