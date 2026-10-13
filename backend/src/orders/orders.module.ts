import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderExpirationService } from './order-expiration.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, CartItem, Product]), ScheduleModule.forRoot()],
  controllers: [OrdersController],
  providers: [OrdersService, OrderExpirationService],
})
export class OrdersModule {}
