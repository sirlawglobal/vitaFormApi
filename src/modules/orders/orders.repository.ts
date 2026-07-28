import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession, FilterQuery } from 'mongoose';
import { Order, OrderDocument } from './orders.schema';
import { OrderStatus, PaymentStatus } from './enums/order-status.enum';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: Partial<Order>, session?: ClientSession): Promise<OrderDocument> {
    const order = new this.orderModel(data);
    return order.save({ session });
  }

  async findById(id: string): Promise<OrderDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.orderModel.findById(id).exec();
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ orderNumber: orderNumber.trim() }).exec();
  }

  async findByCheckoutRef(checkoutRef: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ checkoutRef: checkoutRef.trim() }).exec();
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ items: OrderDocument[]; total: number }> {
    if (!Types.ObjectId.isValid(userId)) return { items: [], total: 0 };
    const skip = (page - 1) * limit;

    const filter = { userId: new Types.ObjectId(userId) };
    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async findAdminFiltered(
    status?: OrderStatus,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: OrderDocument[]; total: number }> {
    const filter: FilterQuery<OrderDocument> = {};

    if (status) {
      filter.orderStatus = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    changedBy = 'system',
    note?: string,
    trackingNumber?: string,
    courierName?: string,
    session?: ClientSession,
  ): Promise<OrderDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const updateObj: Record<string, any> = {
      $set: { orderStatus: newStatus },
      $push: {
        statusHistory: {
          status: newStatus,
          changedAt: new Date().toISOString(),
          changedBy,
          note,
        },
      },
    };

    if (trackingNumber) updateObj.$set.trackingNumber = trackingNumber;
    if (courierName) updateObj.$set.courierName = courierName;

    return this.orderModel.findByIdAndUpdate(id, updateObj, { new: true, session }).exec();
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string,
    session?: ClientSession,
  ): Promise<OrderDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const setObj: Record<string, any> = {
      'paymentSummary.paymentStatus': paymentStatus,
    };
    if (paymentReference) {
      setObj['paymentSummary.paymentReference'] = paymentReference;
    }

    return this.orderModel
      .findByIdAndUpdate(id, { $set: setObj }, { new: true, session })
      .exec();
  }

  async hasDeliveredProduct(userId: string, skus: string[]): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId) || !skus || skus.length === 0) return false;

    const count = await this.orderModel.countDocuments({
      userId: new Types.ObjectId(userId),
      orderStatus: OrderStatus.DELIVERED,
      'items.sku': { $in: skus },
    }).limit(1).exec();

    return count > 0;
  }
}
