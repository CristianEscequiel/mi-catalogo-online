import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { FileStorageService } from 'src/files/file-storage.service';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';
import { canModify } from 'src/common/ownership';
import { Payload } from 'src/auth/models/payload.model';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

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
      this.logger.error('Error creating category', error instanceof Error ? error.stack : String(error));
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

  async update(id: number, updateCategoryDto: UpdateCategoryDto, actor: Payload) {
    const category = await this.findOwnedCategory(id, actor);
    try {
      const { imageUrl: _imageUrl, ...rest } = updateCategoryDto;
      const merged = this.categoryRepository.merge(category, rest);
      return await this.categoryRepository.save(merged);
    } catch {
      throw new BadRequestException('Error updating category');
    }
  }

  async remove(id: number, actor: Payload) {
    const category = await this.findOwnedCategory(id, actor);
    await this.fileStorageService.deleteByPublicPath(category.imageUrl);
    await this.categoryRepository.delete(category.id);
    return { message: 'Category deleted' };
  }

  async uploadImage(id: number, filename: string, actor: Payload) {
    const imageUrl = this.fileStorageService.buildPublicPath(UPLOAD_FOLDERS.categories, filename);
    let category: Category;
    try {
      category = await this.findOwnedCategory(id, actor);
    } catch (error) {
      // FileInterceptor ya escribió el archivo antes de entrar al handler: si se rechaza, no debe quedar huérfano.
      await this.fileStorageService.deleteByPublicPath(imageUrl);
      throw error;
    }

    if (category.imageUrl) {
      throw new ConflictException('Category already has an image. Delete it before uploading a new one.');
    }

    category.imageUrl = imageUrl;
    const savedCategory = await this.categoryRepository.save(category);

    return {
      id: savedCategory.id,
      imageUrl: savedCategory.imageUrl,
    };
  }

  async deleteImage(id: number, actor: Payload) {
    const category = await this.findOwnedCategory(id, actor);
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

  // 404 si no existe y 403 si el actor no es el dueño ni ADMIN (una categoría sin dueño solo la toca un ADMIN).
  private async findOwnedCategory(id: number, actor: Payload) {
    // Solo se carga el id del dueño (con loadRelationIds `user` llega como número) y se descarta después,
    // así las respuestas conservan la forma que tenían antes de esta comprobación.
    const category = await this.categoryRepository.findOne({ where: { id }, loadRelationIds: { relations: ['user'] } });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    const ownerId = category.user as unknown as number | null | undefined;
    if (!canModify(actor, ownerId)) {
      throw new ForbiddenException('No tenés permiso sobre esta categoría');
    }
    delete (category as Partial<Category>).user;
    return category;
  }

  private async findCategoryById(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }
}
