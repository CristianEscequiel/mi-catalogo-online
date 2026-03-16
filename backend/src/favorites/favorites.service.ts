import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Favorite } from './entities/favorite.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAllByUser(userId: number) {
    const favorites = await this.favoritesRepository.find({
      where: { userId },
      relations: ['product', 'product.categories'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map((favorite) => favorite.product);
  }

  async add(userId: number, productId: number) {
    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    const existingFavorite = await this.favoritesRepository.findOne({
      where: { userId, productId },
    });

    if (existingFavorite) {
      return existingFavorite;
    }

    try {
      const favorite = this.favoritesRepository.create({
        userId,
        productId,
      });

      return await this.favoritesRepository.save(favorite);
    } catch {
      throw new BadRequestException('Error adding product to favorites');
    }
  }

  async remove(userId: number, productId: number) {
    const result = await this.favoritesRepository.delete({ userId, productId });

    if (result.affected === 0) {
      throw new NotFoundException(`Favorite for product ${productId} not found`);
    }

    return { message: 'Product removed from favorites' };
  }
}
