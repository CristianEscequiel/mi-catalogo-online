import { BadRequestException, Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { Payload } from 'src/auth/models/payload.model';
import { Product as ProductEntity } from '../entities/product.entity';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { createImageMulterOptions } from 'src/files/multer-image-options.factory';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';
import { AiContentGenerator } from 'src/ai/ai-content-generator.port';
import { GenerateProductFromImageDto } from '../dto/generate-product-from-image.dto';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { AiThrottlerGuard } from 'src/ai/ai-throttler.guard';

@Controller('products')
export class ProductController {
  constructor(
    private readonly postService: ProductService,
    private readonly openAiService: AiContentGenerator,
  ) {}

  @ApiOperation({ summary: 'Create a new Post' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Post()
  create(@Body() createPostDto: CreateProductDto, @CurrentUser() user: Payload) {
    return this.postService.create(createPostDto, user.sub, user.role);
  }

  @ApiOperation({ summary: 'List published products (paginated)' })
  @ApiResponse({ status: 200, description: 'A page of published products: { items, total, page, limit, totalPages }' })
  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.postService.findPublicPage(query);
  }

  @ApiOperation({ summary: 'Get a Product by slug' })
  @ApiResponse({ status: 200, description: 'The product', type: ProductEntity })
  @Get('slug/:slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.postService.findOneBySlug(slug);
  }

  @ApiOperation({ summary: 'Get a Propduct by id' })
  @ApiResponse({ status: 200, description: 'The post', type: ProductEntity })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findPublishedById(id);
  }

  @ApiOperation({ summary: 'Get the published Products of a User' })
  @ApiResponse({ status: 200, description: 'The post', type: ProductEntity })
  @Get('user/:id')
  findOneByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findPublishedByUserId(id);
  }

  @ApiOperation({ summary: 'Update a Product by id' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto, @CurrentUser() user: Payload) {
    return this.postService.update(id, updateProductDto, user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, AiThrottlerGuard)
  @Roles('ADMIN', 'GUEST')
  @Get('generate-ai/:name')
  generateAi(@Param('name') name: string) {
    return this.openAiService.generateProductContent(name);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard, AiThrottlerGuard)
  @Roles('ADMIN', 'GUEST')
  @Post('generate-from-image')
  generateFromImage(@Body() body: GenerateProductFromImageDto) {
    return this.openAiService.generateProductFromImage(body.imageUrl, body.categories);
  }

  @ApiOperation({ summary: 'Publish a post Product by id with AI' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Put(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Payload) {
    return this.postService.publish(id, user.sub);
  }

  @ApiOperation({ summary: 'Delete a Product by ID' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Payload) {
    return this.postService.remove(id, user);
  }

  @ApiOperation({ summary: 'Upload product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', createImageMulterOptions(UPLOAD_FOLDERS.products)))
  uploadImage(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Payload, @UploadedFile() file?: { filename: string }) {
    if (!file?.filename) {
      throw new BadRequestException('File is required');
    }
    return this.postService.uploadImage(id, file.filename, user);
  }

  @ApiOperation({ summary: 'Delete product image' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Delete(':id/image')
  deleteImage(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Payload) {
    return this.postService.deleteImage(id, user);
  }
}
