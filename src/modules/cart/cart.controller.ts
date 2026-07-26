import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Shopping Cart')
@ApiHeader({
  name: 'X-Guest-Session-ID',
  required: false,
  description: 'Guest session UUID (e.g. guest_987xyz) for unauthenticated guest cart operations',
})
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private resolveCartContext(
    req: AuthenticatedRequest,
    guestHeader?: string,
  ): { cartId: string; isGuest: boolean } {
    if (req.session?.userId) {
      return { cartId: req.session.userId, isGuest: false };
    }
    const guestId = guestHeader || 'default_guest_session';
    return { cartId: guestId, isGuest: true };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get current user or guest shopping cart' })
  @ApiResponse({ status: 200, description: 'Calculated cart payload with tax and totals' })
  async getCart(
    @Req() req: AuthenticatedRequest,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.getCart(cartId, isGuest);
  }

  @Public()
  @Post('items')
  @ApiOperation({ summary: 'Add product item to cart' })
  @ApiResponse({ status: 200, description: 'Item added and recalculated cart returned' })
  @ApiResponse({ status: 404, description: 'SKU or product variant not found' })
  async addItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddCartItemDto,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.addItem(cartId, dto, isGuest);
  }

  @Public()
  @Patch('items/:sku')
  @ApiOperation({ summary: 'Update item quantity or options in cart' })
  @ApiParam({ name: 'sku', example: 'VF-ORTHO-KING-01' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  async updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('sku') sku: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.updateItem(cartId, sku, dto, isGuest);
  }

  @Public()
  @Delete('items/:sku')
  @ApiOperation({ summary: 'Remove single item from cart' })
  @ApiParam({ name: 'sku', example: 'VF-ORTHO-KING-01' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('sku') sku: string,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.removeItem(cartId, sku, isGuest);
  }

  @Public()
  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiResponse({ status: 200, description: 'Cart emptied successfully' })
  async clearCart(
    @Req() req: AuthenticatedRequest,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.clearCart(cartId, isGuest);
  }

  @Public()
  @Post('apply-coupon')
  @ApiOperation({ summary: 'Apply promotional coupon to cart' })
  @ApiResponse({ status: 200, description: 'Coupon applied and discount calculated' })
  @ApiResponse({ status: 400, description: 'Cart is empty or coupon invalid' })
  async applyCoupon(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ApplyCouponDto,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.applyCoupon(cartId, dto.couponCode, isGuest);
  }

  @Public()
  @Delete('coupon')
  @ApiOperation({ summary: 'Remove applied coupon from cart' })
  @ApiResponse({ status: 200, description: 'Coupon removed and totals recalculated' })
  async removeCoupon(
    @Req() req: AuthenticatedRequest,
    @Headers('X-Guest-Session-ID') guestHeader?: string,
  ) {
    const { cartId, isGuest } = this.resolveCartContext(req, guestHeader);
    return this.cartService.removeCoupon(cartId, isGuest);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart into user cart upon login' })
  @ApiResponse({ status: 200, description: 'Guest cart merged into user account' })
  async mergeGuestCart(
    @Req() req: AuthenticatedRequest,
    @Body() dto: MergeCartDto,
  ) {
    return this.cartService.mergeGuestCart(dto.guestSessionId, req.session.userId);
  }
}
