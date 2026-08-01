import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryRepository } from './inventory.repository';
import { DOMAIN_EVENTS } from '../../common/constants/event-names.constants';

@Injectable()
export class InventoryEventListener {
  private readonly logger = new Logger(InventoryEventListener.name);

  constructor(private readonly inventoryRepository: InventoryRepository) {}

  @OnEvent(DOMAIN_EVENTS.PRODUCT_DELETED)
  async handleProductDeleted(eventData: any) {
    this.logger.debug(`Received ProductDeleted event. Deleting associated inventory...`);
    try {
      // Outbox worker wraps the original payload in an event envelope
      const productId = eventData.aggregateId || eventData.payload?.id || eventData.payload?._id;
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
