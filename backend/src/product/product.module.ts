import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { ProductController } from './controllers/product.controller';
import { CategoryController } from './controllers/category.controller';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category]), FilesModule],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, CategoryService],
  exports: [ProductService, CategoryService],
})
export class ProductModule {}
