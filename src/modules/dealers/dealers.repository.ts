import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dealer } from './dealers.schema';

@Injectable()
export class DealersRepository {
  constructor(
    @InjectModel(Dealer.name)
    private readonly dealerModel: Model<Dealer>,
  ) {}

  async create(data: Partial<Dealer>): Promise<Dealer> {
    const dealer = new this.dealerModel(data);
    return dealer.save();
  }

  async findNearby(lng: number, lat: number, maxDistanceMeters: number): Promise<Dealer[]> {
    return this.dealerModel
      .find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: maxDistanceMeters,
          },
        },
      })
      .exec();
  }

  async findAll(): Promise<Dealer[]> {
    return this.dealerModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Dealer | null> {
    return this.dealerModel.findById(id).exec();
  }

  async update(id: string, data: Partial<Dealer>): Promise<Dealer | null> {
    return this.dealerModel.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dealerModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
