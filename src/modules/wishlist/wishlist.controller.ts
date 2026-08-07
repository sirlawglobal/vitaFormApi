import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
@UseGuards(SessionAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'Retrieve saved wishlist items for the current user' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully.' })
  @Get()
  async getWishlist(@Req() req: AuthenticatedRequest) {
    return this.wishlistService.getWishlist(req.session.userId);
  }

  @ApiOperation({ summary: 'Add a product to saved wishlist' })
  @ApiResponse({ status: 200, description: 'Item added to wishlist.' })
  @Post()
  @HttpCode(HttpStatus.OK)
  async addItem(@Req() req: AuthenticatedRequest, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.addItem(req.session.userId, dto.productId);
  }

  @ApiOperation({ summary: 'Remove a product from saved wishlist' })
  @ApiResponse({ status: 200, description: 'Item removed from wishlist.' })
  @Delete(':productId')
  async removeItem(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.wishlistService.removeItem(req.session.userId, productId);
  }

  @ApiOperation({ summary: 'Move a saved wishlist item directly into shopping cart' })
  @ApiResponse({ status: 200, description: 'Item moved from wishlist to cart.' })
  @Post(':productId/move-to-cart')
  @HttpCode(HttpStatus.OK)
  async moveToCart(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body('variantId') variantId?: string) {
    const result = await this.wishlistService.moveToCart(req.session.userId, productId, variantId);
    return {
      message: result.message,
    };
  }
}
