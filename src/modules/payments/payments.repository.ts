import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Payment, PaymentDocument } from './payments.schema';
import { PaymentStatus } from '../orders/enums/order-status.enum';

@Injectable()
export class PaymentsRepository {
  private readonly logger = new Logger(PaymentsRepository.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(data: Partial<Payment>, session?: ClientSession): Promise<PaymentDocument> {
    const payment = new this.paymentModel(data);
    return payment.save({ session });
  }

  async findByRef(paymentRef: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ paymentRef: paymentRef.trim() }).exec();
  }

  async findByCheckoutRef(checkoutRef: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findOne({ checkoutRef: checkoutRef.trim() }).exec();
  }

  async updateStatus(
    paymentRef: string,
    status: PaymentStatus,
    gatewayReference?: string,
    rawGatewayResponse?: Record<string, any>,
    session?: ClientSession,
  ): Promise<PaymentDocument | null> {
    const setObj: Record<string, any> = { status };
    if (gatewayReference) setObj.gatewayReference = gatewayReference;
    if (rawGatewayResponse) setObj.rawGatewayResponse = rawGatewayResponse;

    return this.paymentModel
      .findOneAndUpdate({ paymentRef }, { $set: setObj }, { new: true, session })
      .exec();
  }

  async findAdminFiltered(
    page = 1,
    limit = 20,
  ): Promise<{ items: PaymentDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.paymentModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments().exec(),
    ]);

    return { items, total };
  }
}
