import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { OutboxEvent, OutboxEventSchema } from './outbox.schema';
import { OutboxRepository } from './outbox.repository';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
    ]),
  ],
  providers: [OutboxRepository, OutboxService, OutboxWorker],
  exports: [OutboxService],
})
export class OutboxModule {}
