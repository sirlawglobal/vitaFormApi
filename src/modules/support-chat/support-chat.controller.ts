import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SupportChatService } from './support-chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RateConversationDto } from './dto/rate-conversation.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionData } from '../../common/types/session.types';

@ApiTags('Support Chat')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('chat/conversations')
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Post()
  @ApiOperation({ summary: 'Customer opens a new support ticket' })
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  async createTicket(@CurrentUser() user: SessionData, @Body() dto: CreateConversationDto) {
    return this.supportChatService.createConversation(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Fetch list of tickets' })
  async getTickets(
    @CurrentUser() user: SessionData,
    @Query('status') status?: string,
    @Query('skip') skip = '0',
    @Query('limit') limit = '20',
  ) {
    const filter: any = {};
    
    // Customers only see their own tickets
    if (user.role === Role.CUSTOMER) {
      filter.customerId = user.userId;
    } else if (user.role === Role.SUPPORT) {
      // Support agents see tickets assigned to them OR open tickets
      if (status) {
        filter.status = status;
        if (status === 'ASSIGNED') filter.assignedAgentId = user.userId;
      }
    }
    
    return this.supportChatService.getConversations(filter, parseInt(skip, 10), parseInt(limit, 10));
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Fetch historical messages for a ticket' })
  @ApiParam({ name: 'id', description: 'Conversation ObjectId' })
  async getMessages(
    @Param('id') id: string,
    @Query('skip') skip = '0',
    @Query('limit') limit = '50',
  ) {
    return this.supportChatService.getMessages(id, parseInt(skip, 10), parseInt(limit, 10));
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Agent self-claims an open ticket' })
  @UseGuards(RolesGuard)
  @Roles(Role.SUPPORT)
  @ApiParam({ name: 'id', description: 'Conversation ObjectId' })
  async claimTicket(@Param('id') id: string, @CurrentUser() user: SessionData) {
    return this.supportChatService.claimTicket(id, user.userId);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Admin assigns a ticket to a specific agent' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'Conversation ObjectId' })
  async assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.supportChatService.assignTicket(id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Agent or Admin closes a ticket' })
  @UseGuards(RolesGuard)
  @Roles(Role.SUPPORT, Role.ADMIN)
  @ApiParam({ name: 'id', description: 'Conversation ObjectId' })
  async closeTicket(@Param('id') id: string) {
    return this.supportChatService.closeTicket(id);
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Customer submits a post-chat rating' })
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiParam({ name: 'id', description: 'Conversation ObjectId' })
  async rateTicket(
    @Param('id') id: string,
    @CurrentUser() user: SessionData,
    @Body() dto: RateConversationDto,
  ) {
    return this.supportChatService.rateTicket(id, user.userId, dto);
  }
}
