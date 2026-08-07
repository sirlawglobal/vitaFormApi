import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [ProductsModule, UsersModule, OutboxModule, PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
