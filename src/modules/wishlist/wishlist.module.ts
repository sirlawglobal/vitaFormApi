import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wishlist, WishlistSchema } from './wishlist.schema';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { ProductsModule } from '../products/products.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wishlist.name, schema: WishlistSchema }]),
    ProductsModule,
    CartModule,
  ],
  controllers: [WishlistController],
  providers: [WishlistRepository, WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
