import { BadRequestException, Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { Payload } from 'src/auth/models/payload.model';
import { Product as ProductEntity } from '../entities/product.entity';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { createImageMulterOptions } from 'src/files/multer-image-options.factory';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';
import { OpenaiService } from 'src/ai/service/openai.service';
import { GenerateProductFromImageDto } from '../dto/generate-product-from-image.dto';

@Controller('products')
export class ProductController {
  constructor(
    private readonly postService: ProductService,
    private readonly openAiService: OpenaiService,
  ) {}

  @ApiOperation({ summary: 'Create a new Post' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Post()
  create(@Body() createPostDto: CreateProductDto, @Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const role = req.user.role as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payload = req.user as Payload;
    const userID = payload.sub;
    return this.postService.create(createPostDto, userID, role);
  }

  @ApiOperation({ summary: 'Get all Products' })
  @ApiResponse({ status: 200, description: 'The list of products' })
  @Get()
  findAll() {
    return this.postService.findAll();
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
    return this.postService.findOne(id);
  }

  @ApiOperation({ summary: 'Get a Propduct by User id' })
  @ApiResponse({ status: 200, description: 'The post', type: ProductEntity })
  @Get('user/:id')
  findOneByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findOneByUserId(id);
  }

  @ApiOperation({ summary: 'Update a Product by id' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.postService.update(id, updateProductDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Get('generate-ai/:name')
  generateAi(@Param('name') name: string) {
    return this.openAiService.generateProductContent(name);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Post('generate-from-image')
  generateFromImage(@Body() body: GenerateProductFromImageDto) {
    return this.openAiService.generateProductFromImage(body.imageUrl, body.categories);
  }

  @ApiOperation({ summary: 'Publish a post Product by id with AI' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Put(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payload = req.user as Payload;
    const userID = payload.sub;
    return this.postService.publish(id, userID);
  }

  @ApiOperation({ summary: 'Delete a Product by ID' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postService.remove(id);
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
  uploadImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: { filename: string }) {
    if (!file?.filename) {
      throw new BadRequestException('File is required');
    }
    return this.postService.uploadImage(id, file.filename);
  }

  @ApiOperation({ summary: 'Delete product image' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Delete(':id/image')
  deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.postService.deleteImage(id);
  }
}
