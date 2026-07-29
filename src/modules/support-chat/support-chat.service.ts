import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { SupportChatRepository } from './support-chat.repository';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { Conversation, ConversationStatus } from './schemas/conversation.schema';
import { Message, SenderType, Attachment } from './schemas/message.schema';

@Injectable()
export class SupportChatService {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private readonly repository: SupportChatRepository,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createConversation(customerId: string, dto: CreateConversationDto): Promise<Conversation> {
    const conversation = await this.repository.createConversation({
      customerId: new Types.ObjectId(customerId),
      category: dto.category,
      subject: dto.subject,
      status: ConversationStatus.OPEN,
    });
    return conversation;
  }

  async getConversations(filter: any, skip = 0, limit = 20): Promise<Conversation[]> {
    return this.repository.findConversations(filter, skip, limit);
  }

  async getMessages(conversationId: string, skip = 0, limit = 50): Promise<Message[]> {
    return this.repository.findMessagesByConversationId(conversationId, skip, limit);
  }

  /**
   * Dual-Layer Redis Distributed Lock for claiming a ticket.
   */
  async claimTicket(ticketId: string, agentId: string): Promise<Conversation> {
    const lockKey = `ticket_lock:${ticketId}`;
    const LOCK_TTL = 10; // 10 seconds lock

    // Layer 1: Redis Lock (In-Memory Bouncer)
    const acquired = await this.cacheService.setNx(lockKey, agentId, LOCK_TTL);
    if (!acquired) {
      this.logger.warn(`Agent ${agentId} failed to acquire lock for ticket ${ticketId}`);
      throw new ConflictException('Too late! This ticket is currently being claimed by another agent.');
    }

    try {
      // Layer 2: Atomic DB Update (Source of Truth)
      const ticket = await this.repository.claimConversation(ticketId, agentId);
      
      if (!ticket) {
        throw new ConflictException('Ticket has already been claimed or is no longer open.');
      }

      this.eventEmitter.emit('support.ticket.updated', {
        ticketId,
        status: ConversationStatus.ASSIGNED,
        agentId,
      });

      return ticket;
    } finally {
      // Release lock
      await this.cacheService.del(lockKey);
    }
  }

  async assignTicket(ticketId: string, dto: AssignTicketDto): Promise<Conversation> {
    const ticket = await this.repository.updateConversationStatus(
      ticketId,
      ConversationStatus.ASSIGNED,
      dto.agentId,
    );
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    this.eventEmitter.emit('support.ticket.updated', {
      ticketId,
      status: ConversationStatus.ASSIGNED,
      agentId: dto.agentId,
    });

    return ticket;
  }

  async closeTicket(ticketId: string): Promise<Conversation> {
    const ticket = await this.repository.updateConversationStatus(
      ticketId,
      ConversationStatus.CLOSED,
    );
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    this.eventEmitter.emit('support.ticket.updated', {
      ticketId,
      status: ConversationStatus.CLOSED,
    });

    return ticket;
  }

  async rateTicket(ticketId: string, customerId: string, dto: RateConversationDto): Promise<Conversation> {
    const ticket = await this.repository.findConversationById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.customerId.toString() !== customerId) {
      throw new ConflictException('Only the customer can rate this ticket');
    }

    if (ticket.status !== ConversationStatus.CLOSED) {
      throw new ConflictException('Cannot rate a ticket that is not closed');
    }

    const updatedTicket = await this.repository.updateConversationRating(ticketId, dto.rating, dto.ratingComment);
    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found during rating update');
    }
    return updatedTicket;
  }

  // --- MESSAGES ---

  async saveMessage(
    conversationId: string,
    senderId: string,
    senderType: SenderType,
    content: string,
    attachments: Attachment[] = [],
  ): Promise<Message> {
    const message = await this.repository.createMessage({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(senderId),
      senderType,
      content,
      attachments,
    });

    this.eventEmitter.emit('support.message.saved', {
      message,
      conversationId,
    });

    return message;
  }

  async markAsSeen(conversationId: string, readerId: string, readerType: SenderType): Promise<void> {
    await this.repository.markMessagesAsRead(conversationId, readerId, readerType);
  }

  async markAsDelivered(conversationId: string, recipientType: SenderType): Promise<void> {
    await this.repository.markMessagesAsDelivered(conversationId, recipientType);
  }
}
