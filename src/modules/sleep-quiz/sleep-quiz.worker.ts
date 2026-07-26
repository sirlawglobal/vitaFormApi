import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { SleepQuizRepository } from './sleep-quiz.repository';
import { ProductsRepository } from '../products/products.repository';
import { AiProviderFactory } from '../../infrastructure/ai/factories/ai-provider.factory';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CatalogProductSummary } from '../../infrastructure/ai/interfaces/ai-strategy.interface';
import { QUEUE_NAMES } from '../../common/constants/queue-names.constants';

@Injectable()
export class SleepQuizWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SleepQuizWorker.name);
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly sleepQuizRepository: SleepQuizRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly aiProviderFactory: AiProviderFactory,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit(): void {
    const host = this.config.get<string>('redis.bull.host', 'localhost');
    const port = this.config.get<number>('redis.bull.port', 6379);
    const password = this.config.get<string>('redis.bull.password');
    const db = this.config.get<number>('redis.bull.db', 1);
    const tls = this.config.get<Record<string, unknown> | undefined>('redis.bull.tls');

    const connection = { host, port, password, db, tls };

    this.worker = new Worker(
      QUEUE_NAMES.RECOMMENDATION,
      async (job: Job) => {
        return this.processJob(job);
      },
      { connection, concurrency: 2 },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Sleep Quiz job [${job.id}] completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Sleep Quiz job [${job?.id}] failed: ${err.message}`);
    });

    this.logger.log(`SleepQuizWorker started — listening on '${QUEUE_NAMES.RECOMMENDATION}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processJob(job: Job): Promise<any> {
    const { quizId, userId, answers } = job.data;
    this.logger.log(`Processing Sleep Quiz [${quizId}] via AI Provider...`);

    try {
      // 1. Fetch products for catalog context
      const { items: products } = await this.productsRepository.findWithFilter(
        { isActive: true },
        { createdAt: -1 },
        1,
        50,
      );

      const catalogSummary: CatalogProductSummary[] = products.map((p) => ({
        id: p._id.toString(),
        sku: p.variants?.[0]?.sku || `SKU-${p.name.replace(/\s+/g, '-').toUpperCase()}`,
        name: p.name,
        category: p.categorySlug || 'Mattress',
        firmness: p.specifications?.firmness || 'medium',
        price: p.variants?.[0]?.price || 0,
        description: p.description?.substring(0, 150),
      }));

      // 2. Delegate to active AI strategy via Factory
      const strategy = this.aiProviderFactory.getStrategy();
      const result = await strategy.analyzeSleepQuiz(answers, catalogSummary);

      // 3. Update Quiz document in MongoDB
      await this.sleepQuizRepository.markCompleted(quizId, result);

      // 4. Cache recommendation in Redis (24 hour TTL)
      if (userId) {
        const cacheKey = `vitaform:rec:${userId}`;
        await this.cacheService.set(cacheKey, JSON.stringify(result), 86400);
      }

      this.logger.log(
        `Sleep Quiz [${quizId}] successfully analyzed. Recommended SKU: ${result.bestMattressSku}`,
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process Sleep Quiz [${quizId}]: ${errorMessage}`,
      );
      await this.sleepQuizRepository.markFailed(quizId, errorMessage);
      throw error;
    }
  }
}
