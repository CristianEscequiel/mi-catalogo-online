import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../auth/models/authenticated-request.model';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({ summary: 'Get authenticated user cart' })
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.cartService.findAllByUser(req.user.sub);
  }

  @ApiOperation({ summary: 'Update quantity for a cart item' })
  @Patch('items/:productId')
  updateItem(@Param('productId', ParseIntPipe) productId: number, @Body() updateCartItemDto: UpdateCartItemDto, @Request() req: AuthenticatedRequest) {
    return this.cartService.upsertItem(req.user.sub, productId, updateCartItemDto.quantity);
  }

  @ApiOperation({ summary: 'Remove a product from cart' })
  @Delete('items/:productId')
  removeItem(@Param('productId', ParseIntPipe) productId: number, @Request() req: AuthenticatedRequest) {
    return this.cartService.removeItem(req.user.sub, productId);
  }
}
