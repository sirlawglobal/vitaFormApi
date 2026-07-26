import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SleepQuiz, SleepQuizSchema } from './sleep-quiz.schema';
import { SleepQuizRepository } from './sleep-quiz.repository';
import { SleepQuizService } from './sleep-quiz.service';
import { SleepQuizController } from './sleep-quiz.controller';
import { SleepQuizWorker } from './sleep-quiz.worker';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SleepQuiz.name, schema: SleepQuizSchema },
    ]),
    ProductsModule,
  ],
  controllers: [SleepQuizController],
  providers: [
    SleepQuizRepository,
    SleepQuizService,
    SleepQuizWorker,
  ],
  exports: [SleepQuizService, SleepQuizRepository],
})
export class SleepQuizModule {}
