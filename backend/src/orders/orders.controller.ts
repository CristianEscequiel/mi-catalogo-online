import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../auth/models/authenticated-request.model';
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
  create(@Body() createOrderDto: CreateOrderDto, @Request() req: AuthenticatedRequest) {
    return this.ordersService.createOrder(req.user.sub, createOrderDto);
  }

  @ApiOperation({ summary: 'Get order details by ID for authenticated user' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    return this.ordersService.getOrderByIdForRole(id, req.user.sub, req.user.role as Role);
  }

  @ApiOperation({ summary: 'Update order status (admin)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, body.status);
  }
}
