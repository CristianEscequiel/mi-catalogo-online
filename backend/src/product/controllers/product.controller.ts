import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put, UseGuards, Request } from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { Payload } from 'src/auth/models/payload.model';
import { Product as ProductEntity } from '../entities/product.entity';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly postService: ProductService) {}

  @ApiOperation({ summary: 'Create a new Post' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createPostDto: CreateProductDto, @Request() req) {
    const payload = req.user as Payload;
    const userID = payload.sub;
    return this.postService.create(createPostDto, userID);
  }

  @ApiOperation({ summary: 'Get all Post' })
  @ApiResponse({ status: 200, description: 'The list of posts' })
  @Get()
  findAll() {
    return this.postService.findAll();
  }

  @ApiOperation({ summary: 'Get a Post by id' })
  @ApiResponse({ status: 200, description: 'The post', type: ProductEntity })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a Post by id' })
  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.postService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: 'Publish a post Post by id with AI' })
  @UseGuards(AuthGuard('jwt'))
  @Put(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const payload = req.user as Payload;
    const userID = payload.sub;
    return this.postService.publish(id, userID);
  }

  @ApiOperation({ summary: 'Delete a Post by ID' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postService.remove(id);
  }
}
