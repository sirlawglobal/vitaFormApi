import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── Public Endpoints ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Retrieve hierarchical tree of active categories' })
  @ApiResponse({ status: 200, description: 'Category tree retrieved successfully.' })
  @Public()
  @Get()
  async getCategoryTree() {
    return this.categoriesService.getTree();
  }

  @ApiOperation({ summary: 'Retrieve flat list of active categories' })
  @ApiResponse({ status: 200, description: 'Active categories retrieved successfully.' })
  @Public()
  @Get('flat')
  async getActiveCategories() {
    return this.categoriesService.getActiveCategories();
  }

  @ApiOperation({ summary: 'Retrieve category details by URL slug' })
  @ApiResponse({ status: 200, description: 'Category found.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @Public()
  @Get(':slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getBySlug(slug);
  }

  // ── Admin Endpoints ───────────────────────────────────────────────────────

  @ApiOperation({ summary: '[Admin] Retrieve all categories (including inactive)' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin/all')
  async getAllCategoriesAdmin() {
    return this.categoriesService.getAllCategoriesAdmin();
  }

  @ApiOperation({ summary: '[Admin] Create a new category' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @ApiOperation({ summary: '[Admin] Update an existing category and re-index child paths' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @ApiOperation({ summary: '[Admin] Delete a category (requires no child categories)' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
