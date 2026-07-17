import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Inventory } from './inventory.schema';

@Injectable()
export class InventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
  ) {}

  async create(data: Partial<Inventory>, session?: ClientSession): Promise<Inventory> {
    const [inventory] = await this.inventoryModel.create([data], { session });
    return inventory;
  }

  async findBySku(sku: string, session?: ClientSession): Promise<Inventory | null> {
    return this.inventoryModel
      .findOne({ sku: sku.trim() })
      .session(session || null)
      .exec();
  }

  async findByProductId(
    productId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<Inventory[]> {
    if (!Types.ObjectId.isValid(productId)) return [];
    return this.inventoryModel
      .find({ productId: new Types.ObjectId(productId) })
      .session(session || null)
      .exec();
  }

  async findLowStock(): Promise<Inventory[]> {
    const all = await this.inventoryModel.find().exec();
    // Return items where available stock is at or below reorderPoint
    return all.filter((inv) => (inv.quantity - inv.reserved) <= inv.reorderPoint);
  }

  /**
   * Optimistic Concurrency Update:
   * Only succeeds if current `version` matches. Increments requested quantities AND version by 1.
   */
  async optimisticIncrement(
    sku: string,
    currentVersion: number,
    inc: { quantity?: number; reserved?: number },
    session?: ClientSession,
  ): Promise<Inventory | null> {
    return this.inventoryModel
      .findOneAndUpdate(
        { sku: sku.trim(), version: currentVersion },
        { $inc: { ...inc, version: 1 } },
        { new: true, session: session || null },
      )
      .exec();
  }
}
