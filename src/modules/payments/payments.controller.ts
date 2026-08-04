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
  Res,
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

  @Public()
  @Get('simulate/:reference')
  @ApiOperation({ summary: 'Simulate successful payment sandbox environment' })
  async simulatePaymentPage(
    @Param('reference') reference: string,
    @Res() res: any,
  ) {
    let payment;
    try {
      payment = await this.paymentsService.verifyPayment(reference);
    } catch (err) {
      // ignore
    }

    const orderNumber = payment ? payment.orderNumber : 'N/A';
    const amount = payment ? payment.amount : 0;
    const provider = payment ? payment.provider : 'Paystack';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vitafoam Payment Sandbox Simulator</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          width: 90%;
          max-width: 450px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .icon {
          width: 80px;
          height: 80px;
          background: #22c55e;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
          animation: pulse 2s infinite;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 8px;
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 32px;
        }
        .details-box {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 32px;
          text-align: left;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .detail-row:last-child {
          margin-bottom: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 12px;
        }
        .label {
          color: #64748b;
        }
        .value {
          font-weight: 600;
        }
        .btn {
          display: block;
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          box-shadow: 0 10px 20px rgba(139, 92, 246, 0.25);
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(139, 92, 246, 0.4);
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      </style>
      <script>
        setTimeout(function() {
          const path = '/account/orders';
          let redirectUrl = 'http://localhost:3001' + path;
          window.location.href = redirectUrl;
        }, 4000);
      </script>
    </head>
    <body>
      <div class="container">
        <div class="icon">✓</div>
        <h1>Payment Successful!</h1>
        <p class="subtitle">Vitafoam Payment Sandbox Simulator</p>
        
        <div class="details-box">
          <div class="detail-row">
            <span class="label">Provider</span>
            <span class="value" style="text-transform: capitalize;">${provider}</span>
          </div>
          <div class="detail-row">
            <span class="label">Reference</span>
            <span class="value" style="font-family: monospace;">${reference}</span>
          </div>
          <div class="detail-row">
            <span class="label">Order Number</span>
            <span class="value">${orderNumber}</span>
          </div>
          <div class="detail-row">
            <span class="label">Amount Paid</span>
            <span class="value" style="color: #22c55e; font-size: 16px; font-weight: 800;">₦${amount.toLocaleString()}</span>
          </div>
        </div>

        <a href="http://localhost:3001/account/orders" class="btn">Return to Storefront</a>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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
