import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Payload } from '../auth/models/payload.model';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/roles.enum';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Patch } from '@nestjs/common';

@ApiTags('orders')
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Get all orders (admin)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.ordersService.getAllOrders();
  }

  @ApiOperation({ summary: 'Create order from authenticated user cart' })
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    const payload = req.user as Payload;
    return this.ordersService.createOrder(payload.sub, createOrderDto);
  }

  @ApiOperation({ summary: 'Get order details by ID for authenticated user' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const payload = req.user as Payload;
    return this.ordersService.getOrderByIdForRole(id, payload.sub, payload.role as Role);
  }

  @ApiOperation({ summary: 'Update order status (admin)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, body.status);
  }
}
