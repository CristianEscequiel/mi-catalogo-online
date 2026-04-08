import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { FileStorageService } from 'src/files/file-storage.service';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, userId: number, role: string) {
    try {
      if (role === 'GUEST') {
        const count = await this.categoryRepository.count();
        if (count >= 5) {
          throw new ForbiddenException('Límite de demo alcanzado');
        }
      }

      const category = this.categoryRepository.create({
        ...createCategoryDto,
        user: { id: userId },
      });
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Error creating category: ${error.message}`);
    }
  }

  async findAll() {
    const categories = await this.categoryRepository.find();
    return categories;
  }

  async findOne(id: number) {
    return this.findCategoryById(id);
  }

  async getCategoryByProductId(id: number) {
    const category = await this.findOne(id);
    return category.products;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findCategoryById(id);
    try {
      const { imageUrl: _imageUrl, ...rest } = updateCategoryDto;
      const merged = this.categoryRepository.merge(category, rest);
      return await this.categoryRepository.save(merged);
    } catch {
      throw new BadRequestException('Error updating category');
    }
  }

  async remove(id: number) {
    const category = await this.findCategoryById(id);
    await this.fileStorageService.deleteByPublicPath(category.imageUrl);
    await this.categoryRepository.delete(category.id);
    return { message: 'Category deleted' };
  }

  async uploadImage(id: number, filename: string) {
    const category = await this.findCategoryById(id);

    if (category.imageUrl) {
      throw new ConflictException('Category already has an image. Delete it before uploading a new one.');
    }

    category.imageUrl = this.fileStorageService.buildPublicPath(UPLOAD_FOLDERS.categories, filename);
    const savedCategory = await this.categoryRepository.save(category);

    return {
      id: savedCategory.id,
      imageUrl: savedCategory.imageUrl,
    };
  }

  async deleteImage(id: number) {
    const category = await this.findCategoryById(id);
    if (!category.imageUrl) {
      throw new NotFoundException('Category has no image to delete');
    }

    await this.fileStorageService.deleteByPublicPath(category.imageUrl);
    category.imageUrl = null;
    const savedCategory = await this.categoryRepository.save(category);

    return {
      id: savedCategory.id,
      imageUrl: savedCategory.imageUrl,
    };
  }

  private async findCategoryById(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }
}
