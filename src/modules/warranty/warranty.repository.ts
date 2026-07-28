import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Warranty, WarrantyStatus, WarrantyClaim, ClaimStatus } from './warranty.schema';

@Injectable()
export class WarrantyRepository {
  constructor(
    @InjectModel(Warranty.name)
    private readonly warrantyModel: Model<Warranty>,
  ) {}

  async create(data: Partial<Warranty>, session?: ClientSession): Promise<Warranty> {
    const warranty = new this.warrantyModel(data);
    return warranty.save({ session });
  }

  async findBySerialNumber(serialNumber: string): Promise<Warranty | null> {
    return this.warrantyModel.findOne({ serialNumber: serialNumber.trim() }).exec();
  }

  async findById(id: string): Promise<Warranty | null> {
    return this.warrantyModel.findById(id).exec();
  }

  async findByUser(userId: string, skip = 0, limit = 20): Promise<[Warranty[], number]> {
    const filter = { userId: new Types.ObjectId(userId) };
    const [items, total] = await Promise.all([
      this.warrantyModel
        .find(filter)
        .populate('productId', 'name slug images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.warrantyModel.countDocuments(filter).exec(),
    ]);
    return [items, total];
  }

  async addClaim(warrantyId: string, claimData: Partial<WarrantyClaim>): Promise<Warranty | null> {
    return this.warrantyModel
      .findByIdAndUpdate(
        warrantyId,
        {
          $push: { claims: claimData },
          $set: { status: WarrantyStatus.CLAIM_PENDING },
        },
        { new: true },
      )
      .exec();
  }

  async updateClaimStatus(
    warrantyId: string,
    claimId: string,
    status: ClaimStatus,
    resolution?: string,
  ): Promise<Warranty | null> {
    const updatePayload: Record<string, any> = { 'claims.$.status': status };
    if (resolution) updatePayload['claims.$.resolution'] = resolution;
    
    if (status === ClaimStatus.RESOLVED || status === ClaimStatus.REJECTED) {
      updatePayload['status'] = WarrantyStatus.ACTIVE;
    }

    return this.warrantyModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(warrantyId), 'claims._id': new Types.ObjectId(claimId) },
        { $set: updatePayload },
        { new: true },
      )
      .exec();
  }

  async findExpiringWithin(days: number): Promise<Warranty[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return this.warrantyModel
      .find({
        status: WarrantyStatus.ACTIVE,
        expiryNotified: false,
        expiresAt: { $lte: targetDate, $gt: new Date() },
      })
      .exec();
  }

  async markAsNotified(ids: string[]): Promise<void> {
    await this.warrantyModel.updateMany(
      { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
      { $set: { expiryNotified: true } },
    );
  }

  async markExpired(): Promise<number> {
    const result = await this.warrantyModel.updateMany(
      { status: WarrantyStatus.ACTIVE, expiresAt: { $lte: new Date() } },
      { $set: { status: WarrantyStatus.EXPIRED } },
    );
    return result.modifiedCount;
  }
}
