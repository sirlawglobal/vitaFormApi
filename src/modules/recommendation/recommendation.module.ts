import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { MattressFinderController } from './mattress-finder.controller';
import { SleepQuizModule } from '../sleep-quiz/sleep-quiz.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [SleepQuizModule, ProductsModule],
  controllers: [RecommendationController, MattressFinderController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
