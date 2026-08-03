import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(SessionAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@Req() req: AuthenticatedRequest) {
    const wishlist = await this.wishlistService.getWishlist(req.session.userId);
    return {
      message: 'Wishlist retrieved successfully',
      data: wishlist,
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addItem(@Req() req: AuthenticatedRequest, @Body() dto: AddToWishlistDto) {
    const wishlist = await this.wishlistService.addItem(req.session.userId, dto.productId);
    return {
      message: 'Item added to wishlist',
      data: wishlist,
    };
  }

  @Delete(':productId')
  async removeItem(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const wishlist = await this.wishlistService.removeItem(req.session.userId, productId);
    return {
      message: 'Item removed from wishlist',
      data: wishlist,
    };
  }

  @Post(':productId/move-to-cart')
  @HttpCode(HttpStatus.OK)
  async moveToCart(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body('variantId') variantId?: string) {
    const result = await this.wishlistService.moveToCart(req.session.userId, productId, variantId);
    return {
      message: result.message,
    };
  }
}
