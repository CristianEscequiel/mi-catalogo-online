import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ProductService } from '../services/product.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { Payload } from 'src/auth/models/payload.model';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createImageMulterOptions } from 'src/files/multer-image-options.factory';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly productService: ProductService,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const role = req.user.role as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payload = req.user as Payload;
    const userID = payload.sub;
    return this.categoryService.create(createCategoryDto, userID, role);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Get(':id/posts')
  findPosts(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findProductByCategoryId(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }

  @ApiOperation({ summary: 'Upload category image' })
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
  @UseInterceptors(FileInterceptor('file', createImageMulterOptions(UPLOAD_FOLDERS.categories)))
  uploadImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: { filename: string }) {
    if (!file?.filename) {
      throw new BadRequestException('File is required');
    }
    return this.categoryService.uploadImage(id, file.filename);
  }

  @ApiOperation({ summary: 'Delete category image' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'GUEST')
  @Delete(':id/image')
  deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.deleteImage(id);
  }
}
