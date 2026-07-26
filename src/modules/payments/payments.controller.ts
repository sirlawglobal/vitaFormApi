import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { UpdateGatewaySettingsDto } from './dto/update-gateway-settings.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Payments & Gateways')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Public()
  @Get('gateways')
  @ApiOperation({ summary: 'Get active enabled payment gateways for customer checkout' })
  @ApiResponse({ status: 200, description: 'Enabled payment gateways list' })
  async getGateways() {
    return this.paymentsService.getGatewaySettings();
  }

  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('admin/gateways')
  @ApiOperation({ summary: '[Admin] Get payment gateway configuration & default provider' })
  @ApiResponse({ status: 200, description: 'Admin gateway configuration settings' })
  async getAdminGateways() {
    return this.paymentsService.getGatewaySettings();
  }

  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch('admin/gateways')
  @ApiOperation({ summary: '[Admin] Dynamically update default active payment provider' })
  @ApiResponse({ status: 200, description: 'Gateway settings updated successfully' })
  async updateAdminGateways(@Body() dto: UpdateGatewaySettingsDto) {
    return this.paymentsService.updateGatewaySettings(dto);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Post('initialize')
  @ApiOperation({
    summary: 'Initialize payment gateway session for a checkout authorization ref',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment authorization URL generated successfully',
  })
  async initializePayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InitializePaymentDto,
  ) {
    const userEmail = req.session?.email || 'customer@vitafoam.com';
    return this.paymentsService.initializePayment(req.session.userId, dto, userEmail);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify transaction status from payment gateway' })
  @ApiResponse({ status: 200, description: 'Verified payment record status' })
  @ApiResponse({ status: 404, description: 'Payment reference not found' })
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  // ── Public Webhook Handlers ───────────────────────────────────────────────

  @Public()
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack HTTP Webhook listener (Verifies x-paystack-signature)' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'HMAC SHA512 signature computed with Paystack secret key',
  })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  async paystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.paymentsService.processWebhook('paystack', signature || '', rawBody, body);
  }

  @Public()
  @Post('webhook/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave HTTP Webhook listener (Verifies verif-hash)' })
  @ApiHeader({
    name: 'verif-hash',
    description: 'Flutterwave secret hash configured in dashboard',
  })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  async flutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.paymentsService.processWebhook('flutterwave', signature || '', rawBody, body);
  }

  @Public()
  @Post('webhook/moniepoint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Moniepoint HTTP Webhook listener' })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  async moniepointWebhook(@Body() body: any, @Req() req: any) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.paymentsService.processWebhook('moniepoint', '', rawBody, body);
  }

  @Public()
  @Post('webhook/opay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OPay HTTP Webhook listener' })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  async opayWebhook(@Headers('authorization') signature: string, @Body() body: any, @Req() req: any) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.paymentsService.processWebhook('opay', signature || '', rawBody, body);
  }
}
