import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post } from '../entities/post.entity';
import { OpenaiService } from 'src/ai/service/openai.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private openaiService: OpenaiService,
  ) {}

  async create(body: CreatePostDto, userId: number) {
    try {
      const newPost = await this.postRepository.save({
        ...body,
        user: { id: userId },
        categories: body.categoryIds?.map((id) => ({ id })),
      });
      return this.findOne(newPost.id);
    } catch {
      throw new BadRequestException('Error creating post');
    }
  }

  async findAll() {
    const posts = await this.postRepository.find({
      relations: ['user.profile', 'categories'],
    });
    return posts;
  }

  async findOne(id: number) {
    return this.findPostById(id);
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    const post = await this.findPostById(id);
    console.log(post);
    try {
      const updatedPost = this.postRepository.merge(post, updatePostDto);
      return await this.postRepository.save(updatedPost);
    } catch {
      throw new BadRequestException('Error updating post');
    }
  }

  async remove(id: number) {
    const post = await this.findPostById(id);
    await this.postRepository.delete(post.id);
    return { message: 'Post deleted' };
  }

  private async findPostById(id: number) {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['user.profile', 'categories'],
    });
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }
  async findPostByCategoryId(categoryId: number) {
    const post = await this.postRepository.find({
      where: {
        categories: { id: categoryId },
      },
      relations: ['user.profile'],
    });
    if (!post) {
      throw new NotFoundException(`Post with id ${categoryId} not found`);
    }
    return post;
  }

  async publish(id: number, userId: number) {
    const post = await this.findOne(id);
    if (post.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to publish this post');
    }
    if (!post.content || !post.title || post.categories.length === 0) {
      throw new BadRequestException('Post content , title and at leat one categorty are required');
    }
    const summary = await this.openaiService.generateSummary(post.content);
    const image = await this.openaiService.generateImage(summary);
    const changes = this.postRepository.merge(post, {
      isDraft: false,
      summary,
      coverImage: image,
    });
    const updatedPost = await this.postRepository.save(changes);
    return this.findOne(updatedPost.id);
  }
}
