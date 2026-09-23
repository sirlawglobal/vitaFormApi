import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Dealer, DealerSchema } from './dealers.schema';
import { DealersRepository } from './dealers.repository';
import { DealersService } from './dealers.service';
import { DealersController } from './dealers.controller';
import { GooglePlacesService } from './google-places.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Dealer.name, schema: DealerSchema }])],
  controllers: [DealersController],
  providers: [DealersRepository, DealersService, GooglePlacesService],
  exports: [DealersService],
})
export class DealersModule {}
