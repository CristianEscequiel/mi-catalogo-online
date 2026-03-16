import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, CartItem, Product])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
