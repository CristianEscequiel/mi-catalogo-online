import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../entities/product.entity';
import { FileStorageService } from 'src/files/file-storage.service';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private postRepository: Repository<Product>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async create(body: CreateProductDto, userId: number, role: string) {
    try {
      const normalizedCategoryIds = this.normalizeCategoryIds(body.categoryIds);

      if (role === 'GUEST') {
        const count = await this.postRepository.count();
        if (count >= 5) {
          throw new ForbiddenException('Límite de demo alcanzado');
        }
      }
      const newProduct = await this.postRepository.save({
        ...body,
        user: { id: userId },
        categories: normalizedCategoryIds?.map((id) => ({ id })),
      });
      return this.findOne(newProduct.id);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`Error creating product: ${error.message}`);
    }
  }

  async findAll() {
    const products = await this.postRepository.find({
      relations: ['user.profile', 'categories'],
    });
    return products;
  }

  async findOne(id: number) {
    return this.findProductById(id);
  }

  async findOneBySlug(slug: string) {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      throw new BadRequestException('Product slug is required');
    }

    const products = await this.postRepository.find({
      where: { slug: normalizedSlug },
      relations: ['user.profile', 'categories'],
      take: 2,
    });

    if (products.length === 0) {
      throw new NotFoundException(`Product with slug ${normalizedSlug} not found`);
    }

    if (products.length > 1) {
      throw new ConflictException(`Product slug ${normalizedSlug} is duplicated`);
    }

    return products[0];
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findProductById(id);
    try {
      const { categoryIds, thumbnailUrl: _thumbnailUrl, ...rest } = updateProductDto;
      const normalizedCategoryIds = this.normalizeCategoryIds(categoryIds);
      const updatedProduct = this.postRepository.merge(product, rest);
      // Update many-to-many categories when ids are provided (including empty array to clear)
      if (normalizedCategoryIds !== undefined) {
        updatedProduct.categories = normalizedCategoryIds.map((categoryId) => ({ id: categoryId })) as Product['categories'];
      }
      return await this.postRepository.save(updatedProduct);
    } catch (error) {
      throw new BadRequestException(`Error updating product: ${error.message}`);
    }
  }

  async remove(id: number) {
    const product = await this.findProductById(id);
    await this.fileStorageService.deleteByPublicPath(product.thumbnailUrl);
    await this.postRepository.delete(product.id);
    return { message: 'Product deleted' };
  }

  async uploadImage(id: number, filename: string) {
    const product = await this.findProductById(id);

    if (product.thumbnailUrl) {
      throw new ConflictException('Product already has an image. Delete it before uploading a new one.');
    }

    const imageUrl = this.fileStorageService.buildPublicPath(UPLOAD_FOLDERS.products, filename);
    product.thumbnailUrl = imageUrl;

    const savedProduct = await this.postRepository.save(product);
    return {
      id: savedProduct.id,
      imageUrl: savedProduct.thumbnailUrl,
    };
  }

  async deleteImage(id: number) {
    const product = await this.findProductById(id);
    if (!product.thumbnailUrl) {
      throw new NotFoundException('Product has no image to delete');
    }

    await this.fileStorageService.deleteByPublicPath(product.thumbnailUrl);
    product.thumbnailUrl = null;

    const savedProduct = await this.postRepository.save(product);
    return {
      id: savedProduct.id,
      imageUrl: savedProduct.thumbnailUrl,
    };
  }

  private async findProductById(id: number) {
    const product = await this.postRepository.findOne({
      where: { id },
      relations: ['user.profile', 'categories'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }
  async findProductByCategoryId(categoryId: number) {
    const product = await this.postRepository.find({
      where: {
        categories: { id: categoryId },
      },
      relations: ['user.profile'],
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${categoryId} not found`);
    }
    return product;
  }

  async findOneByUserId(id: number) {
    const products = await this.postRepository.find({
      where: {
        user: { id },
      },
      relations: ['user.profile', 'categories'],
    });
    if (!products || products.length === 0) {
      throw new NotFoundException(`Products for user with id ${id} not found`);
    }
    console.log('Products found for user', id, products);
    return products;
  }

  async publish(id: number, userId: number) {
    const product = await this.findOne(id);
    if (product.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to publish this product');
    }
    if (!product.name || !product.description || product.categories.length === 0) {
      throw new BadRequestException('Product content , title and at leat one categorty are required');
    }
    // const updatedPost = await this.postRepository.save(changes);

    return this.findOne(product.id);
  }

  private normalizeCategoryIds(categoryIds?: number[]) {
    if (categoryIds === undefined) {
      return undefined;
    }

    const normalized = Array.from(new Set(categoryIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
    return normalized;
  }
}
