import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';
import { SupportChatGateway } from './support-chat.gateway';
import { SupportChatRepository } from './support-chat.repository';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    CacheModule,
    NotificationsModule,
  ],
  controllers: [SupportChatController],
  providers: [
    SupportChatService,
    SupportChatGateway,
    SupportChatRepository,
  ],
  exports: [SupportChatService],
})
export class SupportChatModule {}
