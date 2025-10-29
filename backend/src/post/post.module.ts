import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostService } from './services/post.service';
import { CategoryService } from './services/category.service';
import { PostController } from './controllers/post.controller';
import { CategoryController } from './controllers/category.controller';
import { Post } from './entities/post.entity';
import { Category } from './entities/category.entity';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Category]), AiModule],
  controllers: [PostController, CategoryController],
  providers: [PostService, CategoryService],
  exports: [PostService, CategoryService],
})
export class PostModule {}
