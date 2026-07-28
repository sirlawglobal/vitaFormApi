import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
  ) {}

  async getWishlist(userId: string) {
    const wishlist = await this.wishlistRepository.getItems(userId);
    if (!wishlist) {
      return this.wishlistRepository.findOrCreate(userId);
    }
    return wishlist;
  }

  async addItem(userId: string, productId: string) {
    // Validate product exists
    const product = await this.productsService.getById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.wishlistRepository.addItem(userId, productId);
  }

  async removeItem(userId: string, productId: string) {
    return this.wishlistRepository.removeItem(userId, productId);
  }

  async moveToCart(userId: string, productId: string, variantId?: string) {
    // 1. Validate product exists
    const product = await this.productsService.getById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Determine default variant if none provided
    const targetSku = variantId || (product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined);

    if (!targetSku) {
       throw new BadRequestException('Product has no variants to add to cart');
    }

    // 2. Add to cart
    await this.cartService.addItem(userId, {
      sku: targetSku,
      quantity: 1,
    });

    // 3. Remove from wishlist
    await this.wishlistRepository.removeItem(userId, productId);

    return { success: true, message: 'Item moved to cart successfully' };
  }
}
