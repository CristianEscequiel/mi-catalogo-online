import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const category = this.categoryRepository.create(createCategoryDto);
      return await this.categoryRepository.save(category);
    } catch {
      throw new BadRequestException('Error creating category');
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
      const merged = this.categoryRepository.merge(category, updateCategoryDto);
      return await this.categoryRepository.save(merged);
    } catch {
      throw new BadRequestException('Error updating category');
    }
  }

  async remove(id: number) {
    const category = await this.findCategoryById(id);
    await this.categoryRepository.delete(category.id);
    return { message: 'Category deleted' };
  }

  private async findCategoryById(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }
}
