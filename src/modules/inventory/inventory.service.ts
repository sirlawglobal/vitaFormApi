import { Injectable, Logger } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { InventoryRepository } from './inventory.repository';
import { ProductsService } from '../products/products.service';
import { AdjustStockDto, ReserveStockDto } from './dto';
import { Inventory } from './inventory.schema';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import {
  NotFoundException,
  ConflictException,
} from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants/error-codes.constants';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly LOCK_TTL = 30; // 30 seconds distributed lock

  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly productsService: ProductsService,
    private readonly cacheService: CacheService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Check stock details for a specific SKU.
   */
  async checkStock(sku: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findBySku(sku);
    if (!inventory) {
      throw new NotFoundException(
        ERROR_CODES.INVENTORY_NOT_FOUND,
        `Inventory record for SKU '${sku}' not found`,
      );
    }
    return inventory;
  }

  /**
   * Get all items currently at or below their reorder threshold.
   */
  async getLowStockAdmin(): Promise<Inventory[]> {
    return this.inventoryRepository.findLowStock();
  }

  /**
   * Admin or automated stock adjustment / intake.
   */
  async adjustStock(dto: AdjustStockDto, session?: ClientSession): Promise<Inventory> {
    const cleanSku = dto.sku.trim();
    let inventory = await this.inventoryRepository.findBySku(cleanSku, session);

    if (!inventory) {
      // Verify variant SKU exists across products
      await this.productsService.getBySku(cleanSku);

      inventory = await this.inventoryRepository.create(
        {
          sku: cleanSku,
          productId: new Types.ObjectId(dto.productId),
          quantity: Math.max(0, dto.quantityChange),
          reserved: 0,
          reorderPoint: dto.reorderPoint ?? 10,
          reorderQuantity: dto.reorderQuantity ?? 50,
          warehouse: dto.warehouse ?? 'Main Warehouse — Ikeja',
          version: 1,
        },
        session,
      );
    } else {
      const newQty = Math.max(0, inventory.quantity + dto.quantityChange);
      const updated = await this.inventoryRepository.optimisticIncrement(
        cleanSku,
        inventory.version,
        { quantity: newQty - inventory.quantity },
        session,
      );
      if (!updated) {
        throw new ConflictException(
          ERROR_CODES.INVENTORY_BUSY,
          'Concurrency version mismatch while adjusting stock. Please retry.',
        );
      }
      inventory = updated;
    }

    await this.outboxService.saveEvent(
      {
        aggregateType: 'Inventory',
        aggregateId: inventory._id.toString(),
        eventType: 'StockAdjusted',
        payload: {
          sku: cleanSku,
          quantityChange: dto.quantityChange,
          newQuantity: inventory.quantity,
          available: inventory.available,
        },
      },
      session,
    );

    this.logger.log(`Adjusted stock for [${cleanSku}] by ${dto.quantityChange} (New total: ${inventory.quantity})`);
    return inventory;
  }

  /**
   * Atomic Stock Reservation during checkout.
   * Enforces both Redis Distributed Lock and MongoDB Optimistic Concurrency Check.
   */
  async reserveStock(dto: ReserveStockDto, session?: ClientSession): Promise<Inventory> {
    const cleanSku = dto.sku.trim();
    const lockKey = `vitaform:inventory:lock:${cleanSku}`;

    // 1. Acquire Distributed Checkout Lock via CacheService.setNx
    const acquired = await this.cacheService.setNx(lockKey, dto.orderId, this.LOCK_TTL);
    if (!acquired) {
      throw new ConflictException(
        ERROR_CODES.INVENTORY_BUSY,
        `High demand: stock for SKU '${cleanSku}' is currently locked by an active checkout. Please try again in a few seconds.`,
      );
    }

    try {
      // 2. Check current stock and availability
      const inventory = await this.checkStock(cleanSku);
      if (inventory.available < dto.quantity) {
        throw new ConflictException(
          ERROR_CODES.INSUFFICIENT_STOCK,
          `Only ${inventory.available} unit(s) available for SKU '${cleanSku}' (Requested: ${dto.quantity}).`,
        );
      }

      // 3. Execute Optimistic Concurrency check-and-increment
      const updated = await this.inventoryRepository.optimisticIncrement(
        cleanSku,
        inventory.version,
        { reserved: dto.quantity },
        session,
      );

      if (!updated) {
        throw new ConflictException(
          ERROR_CODES.INVENTORY_BUSY,
          `Stock for SKU '${cleanSku}' was modified concurrently by another transaction. Please retry.`,
        );
      }

      // 4. Dispatch StockReserved outbox event
      await this.outboxService.saveEvent(
        {
          aggregateType: 'Inventory',
          aggregateId: updated._id.toString(),
          eventType: 'StockReserved',
          payload: {
            sku: cleanSku,
            quantity: dto.quantity,
            orderId: dto.orderId,
            remainingAvailable: updated.available,
          },
        },
        session,
      );

      // 5. If low stock reached, emit LowStockAlert outbox event
      if (updated.available <= updated.reorderPoint) {
        await this.outboxService.saveEvent(
          {
            aggregateType: 'Inventory',
            aggregateId: updated._id.toString(),
            eventType: 'LowStockAlert',
            payload: {
              sku: cleanSku,
              available: updated.available,
              reorderPoint: updated.reorderPoint,
              reorderQuantity: updated.reorderQuantity,
            },
          },
          session,
        );
        this.logger.warn(`Low stock threshold reached for [${cleanSku}] (${updated.available} remaining)`);
      }

      this.logger.log(`Reserved ${dto.quantity} unit(s) of [${cleanSku}] for Order [${dto.orderId}]`);
      return updated;
    } finally {
      // Release distributed lock
      await this.cacheService.del(lockKey);
    }
  }

  /**
   * Release previously reserved stock upon cancelled order or expired checkout session.
   */
  async releaseStock(dto: ReserveStockDto, session?: ClientSession): Promise<Inventory> {
    const cleanSku = dto.sku.trim();
    const lockKey = `vitaform:inventory:lock:${cleanSku}`;

    await this.cacheService.setNx(lockKey, dto.orderId, this.LOCK_TTL);

    try {
      const inventory = await this.checkStock(cleanSku);
      const releaseQty = Math.min(inventory.reserved, dto.quantity);

      const updated = await this.inventoryRepository.optimisticIncrement(
        cleanSku,
        inventory.version,
        { reserved: -releaseQty },
        session,
      );

      if (!updated) {
        throw new ConflictException(
          ERROR_CODES.INVENTORY_BUSY,
          `Concurrency version mismatch releasing stock for SKU '${cleanSku}'. Please retry.`,
        );
      }

      await this.outboxService.saveEvent(
        {
          aggregateType: 'Inventory',
          aggregateId: updated._id.toString(),
          eventType: 'StockReleased',
          payload: {
            sku: cleanSku,
            quantityReleased: releaseQty,
            orderId: dto.orderId,
            newAvailable: updated.available,
          },
        },
        session,
      );

      this.logger.log(`Released ${releaseQty} unit(s) of [${cleanSku}] for Order [${dto.orderId}]`);
      return updated;
    } finally {
      await this.cacheService.del(lockKey);
    }
  }

  /**
   * Confirm physical stock depletion upon order dispatch/fulfillment.
   * Decrements both physical quantity AND reserved count.
   */
  async confirmStockDepletion(dto: ReserveStockDto, session?: ClientSession): Promise<Inventory> {
    const cleanSku = dto.sku.trim();
    const inventory = await this.checkStock(cleanSku);

    const depleteQty = Math.min(inventory.quantity, dto.quantity);
    const depleteReserved = Math.min(inventory.reserved, dto.quantity);

    const updated = await this.inventoryRepository.optimisticIncrement(
      cleanSku,
      inventory.version,
      { quantity: -depleteQty, reserved: -depleteReserved },
      session,
    );

    if (!updated) {
      throw new ConflictException(
        ERROR_CODES.INVENTORY_BUSY,
        `Concurrency version mismatch depleting stock for SKU '${cleanSku}'. Please retry.`,
      );
    }

    await this.outboxService.saveEvent(
      {
        aggregateType: 'Inventory',
        aggregateId: updated._id.toString(),
        eventType: 'StockDepleted',
        payload: {
          sku: cleanSku,
          quantityDepleted: depleteQty,
          orderId: dto.orderId,
          remainingPhysical: updated.quantity,
        },
      },
      session,
    );

    this.logger.log(`Confirmed depletion of ${depleteQty} unit(s) of [${cleanSku}] for Order [${dto.orderId}]`);
    return updated;
  }
}
