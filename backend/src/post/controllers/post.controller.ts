import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put, UseGuards, Request } from '@nestjs/common';
import { PostService } from '../services/post.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { AuthGuard } from '@nestjs/passport';
import { Payload } from 'src/auth/models/payload.model';
import { Post as PostEntity } from '../entities/post.entity';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @ApiOperation({ summary: 'Create a new Post' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createPostDto: CreatePostDto, @Request() req) {
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
  @ApiResponse({ status: 200, description: 'The post', type: PostEntity })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a Post by id' })
  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(id, updatePostDto);
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
