import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersRepository } from './orders.repository';
import { OrderStatus, PaymentStatus, isValidOrderTransition } from './enums/order-status.enum';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { CheckoutInitiateResult } from '../checkout/checkout.service';
import { OrderDocument } from './orders.schema';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryService: InventoryService,
    private readonly outboxService: OutboxService,
  ) {}

  async createOrderFromCheckout(
    userId: string,
    checkout: CheckoutInitiateResult,
  ): Promise<OrderDocument> {
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `VF-${new Date().getFullYear()}-${randomCode}`;

    const orderData = {
      orderNumber,
      userId: new Types.ObjectId(userId),
      items: checkout.items.map((item) => ({
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        primaryImage: item.primaryImage,
        options: item.options,
      })),
      shippingAddress: checkout.shippingAddress,
      paymentSummary: {
        subTotal: checkout.subTotal,
        discountAmount: checkout.discountAmount,
        taxAmount: checkout.taxAmount,
        shippingFee: checkout.shippingFee,
        totalAmount: checkout.totalAmount,
        paymentMethod: checkout.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
      },
      orderStatus: OrderStatus.PENDING,
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          changedAt: new Date().toISOString(),
          changedBy: 'customer',
          note: 'Order created from checkout',
        },
      ],
      notes: checkout.notes,
      checkoutRef: checkout.checkoutRef,
    };

    // Save Order Document
    const order = await this.ordersRepository.create(orderData);

    // Save Outbox Event for Notification and Accounting
    await this.outboxService.saveEvent({
      aggregateType: 'Order',
      aggregateId: order._id.toString(),
      eventType: 'OrderCreated',
      payload: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: userId,
        totalAmount: order.paymentSummary.totalAmount,
        itemCount: order.items.length,
      },
    });

    this.logger.log(`Created Order [${order.orderNumber}] for user [${userId}]`);
    return order;
  }

  async getOrderById(id: string): Promise<OrderDocument> {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderDocument> {
    const order = await this.ordersRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundException(`Order '${orderNumber}' not found`);
    }
    return order;
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    return this.ordersRepository.findByUserId(userId, page, limit);
  }

  async getAdminFilteredOrders(
    status?: OrderStatus,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ) {
    return this.ordersRepository.findAdminFiltered(status, startDate, endDate, page, limit);
  }

  async updateOrderStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    changedBy = 'admin',
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(id);

    // 1. Strict State Machine Validation (Bypass for admin overrides)
    if (changedBy !== 'admin' && !isValidOrderTransition(order.orderStatus, dto.status)) {
      throw new BusinessException({
        code: ERROR_CODES.ORDER_STATUS_INVALID_TRANSITION,
        message: `Invalid order status transition from '${order.orderStatus}' to '${dto.status}'`,
      });
    }

    // 2. Perform Repository Update
    const updatedOrder = await this.ordersRepository.updateStatus(
      id,
      dto.status,
      changedBy,
      dto.note,
      dto.trackingNumber,
      dto.courierName,
    );

    if (!updatedOrder) {
      throw new NotFoundException(`Order '${id}' not found for status update`);
    }

    // 3. Save Outbox Event for Push Worker / Email Worker
    await this.outboxService.saveEvent({
      aggregateType: 'Order',
      aggregateId: id,
      eventType: 'OrderStatusUpdated',
      payload: {
        orderId: id,
        orderNumber: updatedOrder.orderNumber,
        userId: updatedOrder.userId.toString(),
        previousStatus: order.orderStatus,
        newStatus: dto.status,
        trackingNumber: dto.trackingNumber,
        courierName: dto.courierName,
      },
    });

    this.logger.log(`Order [${updatedOrder.orderNumber}] status updated to [${dto.status}]`);
    return updatedOrder;
  }

  async cancelOrder(
    id: string,
    userId: string,
    dto: CancelOrderDto,
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(id);

    if (order.userId.toString() !== userId) {
      throw new NotFoundException(`Order '${id}' not found for this user`);
    }

    // Cancellation is allowed ONLY when PENDING or CONFIRMED
    if (
      order.orderStatus !== OrderStatus.PENDING &&
      order.orderStatus !== OrderStatus.CONFIRMED
    ) {
      throw new BusinessException({
        code: ERROR_CODES.ORDER_CANNOT_BE_CANCELLED,
        message: `Order [${order.orderNumber}] cannot be cancelled while in '${order.orderStatus}' status`,
      });
    }

    // Update status to CANCELLED
    const cancelledOrder = await this.ordersRepository.updateStatus(
      id,
      OrderStatus.CANCELLED,
      'customer',
      dto.reason || 'Cancelled by customer',
    );

    if (!cancelledOrder) {
      throw new NotFoundException(`Failed to cancel order '${id}'`);
    }

    // Release reserved inventory stock back to store catalog
    for (const item of cancelledOrder.items) {
      try {
        await this.inventoryService.releaseStock({
          sku: item.sku,
          quantity: item.quantity,
          orderId: cancelledOrder.orderNumber,
        });
      } catch (err) {
        this.logger.error(
          `Failed releasing stock for SKU [${item.sku}] on order cancellation: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Write Outbox Event for Notification System
    await this.outboxService.saveEvent({
      aggregateType: 'Order',
      aggregateId: id,
      eventType: 'OrderCancelled',
      payload: {
        orderId: id,
        orderNumber: cancelledOrder.orderNumber,
        userId: userId,
        reason: dto.reason,
      },
    });

    this.logger.log(`Order [${cancelledOrder.orderNumber}] successfully cancelled by customer`);
    return cancelledOrder;
  }

  async getOrderTracking(id: string, userId: string) {
    const order = await this.getOrderById(id);

    if (order.userId.toString() !== userId) {
      throw new NotFoundException(`Order '${id}' not found for this user`);
    }

    return {
      orderNumber: order.orderNumber,
      currentStatus: order.orderStatus,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      timeline: order.statusHistory,
      estimatedDelivery: '3 - 5 Business Days',
    };
  }
}
