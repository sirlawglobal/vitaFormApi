import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductsDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Products & Catalog')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── Public Catalog Endpoints ──────────────────────────────────────────────

  @ApiOperation({ summary: 'Retrieve paginated products list with optional filtering & sorting' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  @Public()
  @Get()
  async getProducts(@Query() queryDto: QueryProductsDto) {
    return this.productsService.queryProducts(queryDto);
  }

  @ApiOperation({ summary: 'Retrieve single product detail by URL slug' })
  @ApiResponse({ status: 200, description: 'Product details found.' })
  @ApiResponse({ status: 404, description: 'Product not found or inactive.' })
  @Public()
  @Get(':slug')
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.getBySlug(slug);
  }

  @ApiOperation({ summary: 'Retrieve up to 4 related products in the same category' })
  @ApiResponse({ status: 200, description: 'Related products retrieved successfully.' })
  @Public()
  @Get(':id/related')
  async getRelatedProducts(@Param('id') id: string) {
    return this.productsService.getRelated(id);
  }

  // ── Admin Catalog Management Endpoints ────────────────────────────────────

  @ApiOperation({ summary: '[Admin] Create a new product with variants and specifications' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @ApiOperation({ summary: '[Admin] Update product details, specifications, or variants' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, dto);
  }

  @ApiOperation({ summary: '[Admin] Delete a product and invalidate catalog caches' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}
