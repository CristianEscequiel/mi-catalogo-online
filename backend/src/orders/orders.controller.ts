import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Payload } from '../auth/models/payload.model';
import { Roles } from '../auth/roles/roles.decorator';
import { Role } from '../auth/roles/roles.enum';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
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
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: Payload) {
    return this.ordersService.createOrder(user.sub, createOrderDto);
  }

  @ApiOperation({ summary: 'Get paginated orders of the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Page of the user orders: { items, total, page, limit, totalPages }',
  })
  @Get('me')
  findMine(@Query() query: ListMyOrdersQueryDto, @CurrentUser() user: Payload) {
    return this.ordersService.getMyOrders(user.sub, query);
  }

  @ApiOperation({ summary: 'Get order details by ID for authenticated user' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: Payload) {
    return this.ordersService.getOrderByIdForRole(id, user.sub, user.role as Role);
  }

  @ApiOperation({ summary: 'Update order status (admin)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, body.status);
  }
}
