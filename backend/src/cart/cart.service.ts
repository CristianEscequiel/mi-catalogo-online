import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { CartItem } from './entities/cart-item.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAllByUser(userId: number) {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    });

    const items = cartItems.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      stock: item.product.stock,
      thumbnailUrl: item.product.thumbnailUrl,
      subtotal: item.product.price * item.quantity,
    }));

    return {
      items,
      total: items.reduce((acc, item) => acc + item.subtotal, 0),
    };
  }

  async upsertItem(userId: number, productId: number, quantity: number) {
    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    const availableStock = product.stock ?? 0;
    if (quantity > availableStock) {
      throw new BadRequestException(`Requested quantity exceeds stock (${availableStock})`);
    }

    const existingItem = await this.cartRepository.findOne({ where: { userId, productId } });

    if (!existingItem) {
      const cartItem = this.cartRepository.create({
        userId,
        productId,
        quantity,
      });
      await this.cartRepository.save(cartItem);
      return this.findAllByUser(userId);
    }

    existingItem.quantity = quantity;
    await this.cartRepository.save(existingItem);
    return this.findAllByUser(userId);
  }

  async removeItem(userId: number, productId: number) {
    const result = await this.cartRepository.delete({ userId, productId });

    if (result.affected === 0) {
      throw new NotFoundException(`Cart item for product ${productId} not found`);
    }

    return this.findAllByUser(userId);
  }
}
