import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../products/products.schema';

@Injectable()
export class SearchProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchProcessor.name);
  private readonly AUTOCOMPLETE_KEY = 'vitaform:search:autocomplete';
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  onModuleInit(): void {
    const host = this.config.get<string>('redis.bull.host', 'localhost');
    const port = this.config.get<number>('redis.bull.port', 6379);
    const password = this.config.get<string>('redis.bull.password');
    const db = this.config.get<number>('redis.bull.db', 1);
    const tls = this.config.get<Record<string, unknown> | undefined>('redis.bull.tls');

    const connection = { host, port, password, db, tls };

    this.worker = new Worker(
      QUEUE_NAMES.SEARCH,
      async (job: Job) => {
        try {
          await this.processJob(job);
        } catch (error) {
          this.logger.error(`Job ${job.name} failed`, error);
          throw error;
        }
      },
      { connection, concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.name} failed with error: ${err.message}`);
    });

    this.logger.log(`Started BullMQ worker for queue '${QUEUE_NAMES.SEARCH}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processJob(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.INDEX_PRODUCT:
        await this.handleIndexProduct(job.data);
        break;
      case JOB_NAMES.REINDEX_ALL:
        await this.handleReindexAll();
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleIndexProduct(product: any): Promise<void> {
    const client = this.cacheService.getClient();
    const terms = new Set<string>();

    if (product.name) terms.add(product.name.toLowerCase().trim());
    if (product.variants && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (variant.sku) terms.add(variant.sku.toLowerCase().trim());
      }
    }

    if (terms.size === 0) return;

    const pipeline = client.pipeline();
    for (const term of terms) {
      pipeline.zadd(this.AUTOCOMPLETE_KEY, 0, term);
    }
    await pipeline.exec();
    
    this.logger.log(`Indexed product [${product.slug}] into autocomplete`);
  }

  private async handleReindexAll(): Promise<void> {
    this.logger.log('Starting full reindex for autocomplete...');
    
    const client = this.cacheService.getClient();
    await client.del(this.AUTOCOMPLETE_KEY);

    const products = await this.productModel.find({ isActive: true }).select('name slug variants.sku').exec();
    
    if (products.length === 0) {
      this.logger.log('No active products found for reindexing');
      return;
    }

    const pipeline = client.pipeline();
    let count = 0;

    for (const product of products) {
      const name = product.name?.toLowerCase().trim();
      if (name) {
        pipeline.zadd(this.AUTOCOMPLETE_KEY, 0, name);
        count++;
      }
      
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (variant.sku) {
            pipeline.zadd(this.AUTOCOMPLETE_KEY, 0, variant.sku.toLowerCase().trim());
            count++;
          }
        }
      }
    }

    await pipeline.exec();
    this.logger.log(`Reindex complete. Indexed ${count} terms from ${products.length} products.`);
  }
}
