import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CalculateFeesDto } from './dto/calculate-fees.dto';
import { InitiateCheckoutDto } from './dto/initiate-checkout.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Checkout')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('calculate-fees')
  @ApiOperation({ summary: 'Preview fee calculation and address summary before checkout' })
  @ApiResponse({ status: 200, description: 'Fee calculation preview breakdown' })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  async calculateFees(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CalculateFeesDto,
  ) {
    return this.checkoutService.calculateFees(req.session.userId, dto);
  }

  @Get('validate-address/:addressId')
  @ApiOperation({ summary: 'Validate delivery address on user profile for checkout eligibility' })
  @ApiResponse({ status: 200, description: 'Address validated' })
  @ApiResponse({ status: 404, description: 'Address not found on profile' })
  async validateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ) {
    return this.checkoutService.validateAddress(req.session.userId, addressId);
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate order checkout, acquire SKU locks, and prepare payment' })
  @ApiResponse({ status: 201, description: 'Checkout initiated and order reference generated' })
  @ApiResponse({ status: 400, description: 'Empty cart or invalid address' })
  @ApiResponse({ status: 409, description: 'SKU inventory is busy being checked out by another user' })
  async initiateCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InitiateCheckoutDto,
  ) {
    return this.checkoutService.initiateCheckout(req.session.userId, dto);
  }
}
