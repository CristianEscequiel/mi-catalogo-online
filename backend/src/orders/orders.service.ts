import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { Role } from '../auth/roles/roles.enum';

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
        status: OrderStatus.PENDING_PAYMENT,
      });

      const savedOrder = await orderRepository.save(order);

      const orderItems = cartItems.map((cartItem) => {
        const unitPrice = cartItem.product.price ?? 0;
        return orderItemRepository.create({
          orderId: savedOrder.id,
          productId: cartItem.productId,
          productName: cartItem.product.name,
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
        id: savedOrder.id,
        status: savedOrder.status,
        customerName: savedOrder.customerName,
        customerEmail: savedOrder.customerEmail,
        customerAddress: savedOrder.shippingAddress,
        total: savedOrder.total,
        createdAt: savedOrder.createdAt,
        items: orderItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      };
    });
  }

  async getOrderById(orderId: number, userId: number) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId, userId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    return {
      id: order.id,
      status: order.status,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerAddress: order.shippingAddress,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    };
  }

  async getAllOrders() {
    const orders = await this.dataSource.getRepository(Order).find({
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    }));
  }

  async getOrderByIdForRole(orderId: number, userId: number, role: Role) {
    if (role === Role.ADMIN) {
      const order = await this.dataSource.getRepository(Order).findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throw new NotFoundException(`Order with id ${orderId} not found`);
      }

      return {
        id: order.id,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerAddress: order.shippingAddress,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      };
    }

    return this.getOrderById(orderId, userId);
  }

  async updateStatus(orderId: number, status: OrderStatus) {
    const orderRepository = this.dataSource.getRepository(Order);
    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    order.status = status;
    const savedOrder = await orderRepository.save(order);

    return {
      id: savedOrder.id,
      status: savedOrder.status,
    };
  }
}
