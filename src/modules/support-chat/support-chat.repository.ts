import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationStatus } from './schemas/conversation.schema';
import { Message, SenderType } from './schemas/message.schema';

@Injectable()
export class SupportChatRepository {
  private readonly logger = new Logger(SupportChatRepository.name);

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createConversation(data: Partial<Conversation>): Promise<Conversation> {
    const created = new this.conversationModel(data);
    return created.save();
  }

  async findConversationById(id: Types.ObjectId | string): Promise<Conversation | null> {
    return this.conversationModel.findById(id).exec();
  }

  async findConversations(filter: any, skip = 0, limit = 20): Promise<Conversation[]> {
    return this.conversationModel
      .find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'firstName lastName email profilePicture')
      .populate('assignedAgentId', 'firstName lastName email profilePicture')
      .exec();
  }

  async updateConversationStatus(
    id: Types.ObjectId | string,
    status: ConversationStatus,
    agentId?: Types.ObjectId | string,
  ): Promise<Conversation | null> {
    const updateQuery: any = { status };
    if (agentId) {
      updateQuery.assignedAgentId = agentId;
    }
    return this.conversationModel
      .findByIdAndUpdate(id, { $set: updateQuery }, { new: true })
      .exec();
  }

  /**
   * Atomic claim using MongoDB findOneAndUpdate
   */
  async claimConversation(
    id: Types.ObjectId | string,
    agentId: Types.ObjectId | string,
  ): Promise<Conversation | null> {
    return this.conversationModel
      .findOneAndUpdate(
        { _id: id, status: ConversationStatus.OPEN, assignedAgentId: null },
        { $set: { status: ConversationStatus.ASSIGNED, assignedAgentId: agentId } },
        { new: true },
      )
      .exec();
  }

  async updateConversationRating(
    id: Types.ObjectId | string,
    rating: number,
    comment?: string,
  ): Promise<Conversation | null> {
    return this.conversationModel
      .findByIdAndUpdate(
        id,
        {
          $set: { rating, ratingComment: comment, ratedAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  async updateConversationLastMessage(id: Types.ObjectId | string): Promise<void> {
    await this.conversationModel.updateOne(
      { _id: id },
      { $set: { lastMessageAt: new Date() } },
    ).exec();
  }

  // --- MESSAGES ---

  async createMessage(data: Partial<Message>): Promise<Message> {
    const created = new this.messageModel(data);
    const savedMessage = await created.save();
    
    // Auto-update conversation timestamp
    await this.updateConversationLastMessage(savedMessage.conversationId);
    
    return savedMessage;
  }

  async findMessagesByConversationId(
    conversationId: Types.ObjectId | string,
    skip = 0,
    limit = 50,
  ): Promise<Message[]> {
    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async markMessagesAsRead(
    conversationId: Types.ObjectId | string,
    readerId: Types.ObjectId | string,
    readerType: SenderType,
  ): Promise<void> {
    const senderTypeToUpdate =
      readerType === SenderType.CUSTOMER ? SenderType.AGENT : SenderType.CUSTOMER;

    await this.messageModel.updateMany(
      {
        conversationId,
        senderType: senderTypeToUpdate,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    ).exec();
  }

  async markMessagesAsDelivered(
    conversationId: Types.ObjectId | string,
    recipientType: SenderType,
  ): Promise<void> {
    const senderTypeToUpdate =
      recipientType === SenderType.CUSTOMER ? SenderType.AGENT : SenderType.CUSTOMER;

    await this.messageModel.updateMany(
      {
        conversationId,
        senderType: senderTypeToUpdate,
        deliveredAt: null,
      },
      {
        $set: { deliveredAt: new Date() },
      },
    ).exec();
  }
}
