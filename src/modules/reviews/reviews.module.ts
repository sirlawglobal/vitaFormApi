import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './reviews.schema';
import { ReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsListener } from './reviews.listener';
import { OrdersModule } from '../orders/orders.module';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    OrdersModule,
    OutboxModule,
    ProductsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsRepository, ReviewsService, ReviewsListener],
  exports: [ReviewsService],
})
export class ReviewsModule {}
