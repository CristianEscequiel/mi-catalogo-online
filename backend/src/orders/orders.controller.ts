import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Payload } from '../auth/models/payload.model';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Create order from authenticated user cart' })
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    const payload = req.user as Payload;
    return this.ordersService.createOrder(payload.sub, createOrderDto);
  }
}
