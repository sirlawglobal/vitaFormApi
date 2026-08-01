import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryRepository } from './inventory.repository';
import { EVENT_NAMES } from '../../common/constants/event-names.constants';

@Injectable()
export class InventoryEventListener {
  private readonly logger = new Logger(InventoryEventListener.name);

  constructor(private readonly inventoryRepository: InventoryRepository) {}

  @OnEvent(EVENT_NAMES.PRODUCT_DELETED)
  async handleProductDeleted(payload: any) {
    this.logger.debug(`Received ProductDeleted event. Deleting associated inventory...`);
    try {
      const productId = payload.id || payload._id;
      if (productId) {
        const deleted = await this.inventoryRepository.deleteByProductId(productId);
        if (deleted) {
          this.logger.log(`Deleted inventory records for Product [${productId}]`);
        }
      }
    } catch (err) {
      this.logger.error('Failed to handle ProductDeleted event in Inventory', err);
    }
  }
}
