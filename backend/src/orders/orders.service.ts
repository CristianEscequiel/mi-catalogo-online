import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(CartItem);
      const productRepository = manager.getRepository(Product);
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      const cartItems = await cartRepository.find({
        where: { userId },
        relations: ['product'],
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      for (const cartItem of cartItems) {
        const product = cartItem.product;
        const currentStock = product.stock ?? 0;

        if (cartItem.quantity > currentStock) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }
      }

      const total = cartItems.reduce((acc, cartItem) => {
        const unitPrice = cartItem.product.price ?? 0;
        return acc + unitPrice * cartItem.quantity;
      }, 0);

      const order = orderRepository.create({
        userId,
        customerName: createOrderDto.name,
        customerEmail: createOrderDto.email,
        shippingAddress: createOrderDto.address,
        total,
      });

      const savedOrder = await orderRepository.save(order);

      const orderItems = cartItems.map((cartItem) => {
        const unitPrice = cartItem.product.price ?? 0;
        return orderItemRepository.create({
          orderId: savedOrder.id,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          unitPrice,
          subtotal: unitPrice * cartItem.quantity,
        });
      });

      await orderItemRepository.save(orderItems);

      for (const cartItem of cartItems) {
        const product = cartItem.product;
        const newStock = (product.stock ?? 0) - cartItem.quantity;
        await productRepository.update(product.id, { stock: newStock });
      }

      await cartRepository.delete({ userId });

      return {
        orderId: savedOrder.id,
        total: savedOrder.total,
        itemsCount: orderItems.length,
      };
    });
  }
}
