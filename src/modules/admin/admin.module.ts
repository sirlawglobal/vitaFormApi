import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { PlatformSettings, SettingsSchema } from './schemas/settings.schema';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { User, UserSchema } from '../users/users.schema';
import { Order, OrderSchema } from '../orders/orders.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: PlatformSettings.name, schema: SettingsSchema },
      { name: Banner.name, schema: BannerSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
