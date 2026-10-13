import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Payload } from '../auth/models/payload.model';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({ summary: 'Get authenticated user cart' })
  @Get()
  findAll(@CurrentUser() user: Payload) {
    return this.cartService.findAllByUser(user.sub);
  }

  @ApiOperation({ summary: 'Update quantity for a cart item' })
  @Patch('items/:productId')
  updateItem(@Param('productId', ParseIntPipe) productId: number, @Body() updateCartItemDto: UpdateCartItemDto, @CurrentUser() user: Payload) {
    return this.cartService.upsertItem(user.sub, productId, updateCartItemDto.quantity);
  }

  @ApiOperation({ summary: 'Remove a product from cart' })
  @Delete('items/:productId')
  removeItem(@Param('productId', ParseIntPipe) productId: number, @CurrentUser() user: Payload) {
    return this.cartService.removeItem(user.sub, productId);
  }
}
