import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Warranty, WarrantySchema } from './warranty.schema';
import { WarrantyRepository } from './warranty.repository';
import { WarrantyService } from './warranty.service';
import { WarrantyController } from './warranty.controller';
import { WarrantyExpiryProcessor } from './warranty-expiry.processor';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { ProductsModule } from '../products/products.module';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Warranty.name, schema: WarrantySchema }]),
    QueueModule,
    OutboxModule,
    ProductsModule, // For verifying products exist
  ],
  controllers: [WarrantyController],
  providers: [WarrantyRepository, WarrantyService, WarrantyExpiryProcessor],
  exports: [WarrantyService],
})
export class WarrantyModule implements OnModuleInit {
  private readonly logger = new Logger(WarrantyModule.name);

  constructor(private readonly queueService: QueueService) { }

  async onModuleInit() {
    this.logger.log('Scheduling Warranty Expiry Cron Job...');
    await this.queueService.add(
      QUEUE_NAMES.WARRANTY,
      JOB_NAMES.PROCESS_EXPIRING_WARRANTIES,
      {},
      {
        repeat: { pattern: '0 0 * * *' }, // Run daily at midnight
        jobId: 'warranty-expiry-cron', // Unique ID prevents duplicates
      },
    );
  }
}
