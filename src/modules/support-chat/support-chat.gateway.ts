import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupportChatService } from './support-chat.service';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { SessionData } from '../../common/types/session.types';
import { SenderType, Attachment } from './schemas/message.schema';
import { Role } from '../../common/enums/role.enum';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({ namespace: '/support', cors: true })
@UseGuards(WsAuthGuard)
export class SupportChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportChatGateway.name);

  constructor(
    private readonly supportChatService: SupportChatService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected to /support namespace: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /support namespace: ${client.id}`);
  }

  private getRoomName(conversationId: string): string {
    return `room_conv_${conversationId}`;
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId) {
      throw new WsException('conversationId is required');
    }
    const room = this.getRoomName(conversationId);
    await client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; content: string; attachments?: Attachment[] },
  ) {
    const user = client.data.user as SessionData;
    const senderType = user.role === Role.CUSTOMER ? SenderType.CUSTOMER : SenderType.AGENT;

    // 1. Save to DB
    const message = await this.supportChatService.saveMessage(
      payload.conversationId,
      user.userId,
      senderType,
      payload.content,
      payload.attachments || [],
    );

    const room = this.getRoomName(payload.conversationId);

    // 2. Broadcast to room (including sender to confirm receipt, or use broadcast.to to skip sender)
    this.server.to(room).emit('message.new', message);

    // 3. Fallback to Push Notification if recipient is not in the room
    await this.handleOfflinePushNotification(room, payload.conversationId, message, senderType);

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    const room = this.getRoomName(conversationId);
    client.to(room).emit('typing', { senderId: client.data.user.userId });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    const room = this.getRoomName(conversationId);
    client.to(room).emit('stop-typing', { senderId: client.data.user.userId });
  }

  @SubscribeMessage('message-seen')
  async handleMessageSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    const user = client.data.user as SessionData;
    const readerType = user.role === Role.CUSTOMER ? SenderType.CUSTOMER : SenderType.AGENT;

    await this.supportChatService.markAsSeen(conversationId, user.userId, readerType);

    const room = this.getRoomName(conversationId);
    this.server.to(room).emit('message.seen', {
      conversationId,
      readerId: user.userId,
      readAt: new Date(),
    });
  }

  @SubscribeMessage('message-delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    const user = client.data.user as SessionData;
    const recipientType = user.role === Role.CUSTOMER ? SenderType.CUSTOMER : SenderType.AGENT;

    await this.supportChatService.markAsDelivered(conversationId, recipientType);

    const room = this.getRoomName(conversationId);
    this.server.to(room).emit('message.delivered', {
      conversationId,
      recipientId: user.userId,
      deliveredAt: new Date(),
    });
  }

  // --- Internal Event Listeners ---

  @OnEvent('support.ticket.updated')
  handleTicketUpdated(payload: { ticketId: string; status: string; agentId?: string }) {
    const room = this.getRoomName(payload.ticketId);
    this.server.to(room).emit('conversation.updated', payload);
    // Alert the system that a ticket assignment has changed so Dashboards update
    this.server.emit('ticket.list.refresh');
  }

  // --- Helpers ---

  private async handleOfflinePushNotification(
    room: string,
    conversationId: string,
    message: any,
    senderType: SenderType
  ) {
    try {
      const roomClients = await this.server.in(room).fetchSockets();

      // If there's only 1 client in the room, the other party is offline
      if (roomClients.length <= 1) {
        this.logger.log(`Recipient offline in room ${room}, triggering push notification.`);
        // Note: In a real app, you would fetch the conversation to get the exact recipient user ID.
        // For brevity, we trigger a generic push using NotificationsService.

        // await this.notificationsService.sendPushNotification(recipientId, 'New Support Message', message.content);

        // Emitting internal event for notifications module to handle the push logic
        this.supportChatService['eventEmitter'].emit('support.message.offline', {
          conversationId,
          message,
          senderType,
        });
      }
    } catch (error) {
      this.logger.error('Failed to check room occupancy for push notification', error);
    }
  }
}
