import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Inventory, InventorySchema } from './inventory.schema';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryEventListener } from './inventory-event.listener';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Inventory.name, schema: InventorySchema }]),
    ProductsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryRepository, InventoryService, InventoryEventListener],
  exports: [InventoryRepository, InventoryService, MongooseModule],
})
export class InventoryModule {}
