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
    return this.wishlistService.getWishlist(req.session.userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async addItem(@Req() req: AuthenticatedRequest, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.addItem(req.session.userId, dto.productId);
  }

  @Delete(':productId')
  async removeItem(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.wishlistService.removeItem(req.session.userId, productId);
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
