import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private postRepository: Repository<Product>,
  ) {}

  async create(body: CreateProductDto, userId: number, role: string) {
    try {
      if (role === 'GUEST') {
        const count = await this.postRepository.count({
          where: {
            user: { id: userId },
          },
        });
        if (count >= 5) {
          throw new ForbiddenException('El usuario invitado solo puede crear hasta 5 productos');
        }
      }
      const newProduct = await this.postRepository.save({
        ...body,
        user: { id: userId },
        categories: body.categoryIds?.map((id) => ({ id })),
      });
      return this.findOne(newProduct.id);
    } catch (error) {
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

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findProductById(id);
    try {
      const { categoryIds, ...rest } = updateProductDto;
      const updatedProduct = this.postRepository.merge(product, rest);
      // Update many-to-many categories when ids are provided (including empty array to clear)
      if (categoryIds !== undefined) {
        updatedProduct.categories = categoryIds.map((categoryId) => ({ id: categoryId })) as Product['categories'];
      }
      return await this.postRepository.save(updatedProduct);
    } catch {
      throw new BadRequestException('Error updating product');
    }
  }

  async remove(id: number) {
    const product = await this.findProductById(id);
    await this.postRepository.delete(product.id);
    return { message: 'Product deleted' };
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
}
