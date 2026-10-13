import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Payload } from '../auth/models/payload.model';
import { Product } from '../product/entities/product.entity';
import { FavoritesService } from './favorites.service';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@ApiTags('favorites')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiOperation({ summary: 'Get all favorites for authenticated user' })
  @ApiResponse({ status: 200, description: 'Favorites list', type: Product, isArray: true })
  @Get()
  findAll(@CurrentUser() user: Payload) {
    return this.favoritesService.findAllByUser(user.sub);
  }

  @ApiOperation({ summary: 'Add product to favorites for authenticated user' })
  @Post(':productId')
  add(@Param('productId', ParseIntPipe) productId: number, @CurrentUser() user: Payload) {
    return this.favoritesService.add(user.sub, productId);
  }

  @ApiOperation({ summary: 'Remove product from favorites for authenticated user' })
  @Delete(':productId')
  remove(@Param('productId', ParseIntPipe) productId: number, @CurrentUser() user: Payload) {
    return this.favoritesService.remove(user.sub, productId);
  }
}
