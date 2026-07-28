import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from './articles.schema';
import { ArticlesRepository } from './articles.repository';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Article.name, schema: ArticleSchema }]),
    OutboxModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesRepository, ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
