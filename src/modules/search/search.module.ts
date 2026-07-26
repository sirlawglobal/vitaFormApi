import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchProcessor } from './search.processor';
import { SearchEventListener } from './search-event.listener';
import { Product, ProductSchema } from '../products/products.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchProcessor,
    SearchEventListener,
  ],
  exports: [SearchService],
})
export class SearchModule {}
