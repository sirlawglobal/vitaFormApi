import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../common/constants/queue-names.constants';

@Injectable()
export class SearchEventListener {
  private readonly logger = new Logger(SearchEventListener.name);

  constructor(private readonly queueService: QueueService) {}

  @OnEvent('ProductCreated')
  @OnEvent('ProductUpdated')
  async handleProductMutated(payload: any) {
    this.logger.debug(`Received Product mutation event, dispatching to search.queue...`);
    try {
      await this.queueService.add(QUEUE_NAMES.SEARCH, JOB_NAMES.INDEX_PRODUCT, payload);
    } catch (err) {
      this.logger.error('Failed to enqueue INDEX_PRODUCT job', err);
    }
  }

  @OnEvent('ProductDeleted')
  async handleProductDeleted(payload: any) {
    this.logger.debug(`Received ProductDeleted event. Triggering full reindex...`);
    // Alternatively, we could create a REMOVE_FROM_INDEX job if we wanted to be more precise,
    // but a REINDEX_ALL ensures autocomplete stays perfectly in sync when things are deleted.
    // Given autocomplete is lightweight (just product names), REINDEX_ALL is acceptable.
    try {
      await this.queueService.add(QUEUE_NAMES.SEARCH, JOB_NAMES.REINDEX_ALL, payload);
    } catch (err) {
      this.logger.error('Failed to enqueue REINDEX_ALL job', err);
    }
  }
}
