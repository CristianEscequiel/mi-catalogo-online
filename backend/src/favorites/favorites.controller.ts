import { Controller, Delete, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Payload } from '../auth/models/payload.model';
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
  findAll(@Request() req) {
    const payload = req.user as Payload;
    return this.favoritesService.findAllByUser(payload.sub);
  }

  @ApiOperation({ summary: 'Add product to favorites for authenticated user' })
  @Post(':productId')
  add(@Param('productId', ParseIntPipe) productId: number, @Request() req) {
    const payload = req.user as Payload;
    return this.favoritesService.add(payload.sub, productId);
  }

  @ApiOperation({ summary: 'Remove product from favorites for authenticated user' })
  @Delete(':productId')
  remove(@Param('productId', ParseIntPipe) productId: number, @Request() req) {
    const payload = req.user as Payload;
    return this.favoritesService.remove(payload.sub, productId);
  }
}
