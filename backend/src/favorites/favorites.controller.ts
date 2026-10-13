import { Controller, Delete, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../auth/models/authenticated-request.model';
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
  findAll(@Request() req: AuthenticatedRequest) {
    return this.favoritesService.findAllByUser(req.user.sub);
  }

  @ApiOperation({ summary: 'Add product to favorites for authenticated user' })
  @Post(':productId')
  add(@Param('productId', ParseIntPipe) productId: number, @Request() req: AuthenticatedRequest) {
    return this.favoritesService.add(req.user.sub, productId);
  }

  @ApiOperation({ summary: 'Remove product from favorites for authenticated user' })
  @Delete(':productId')
  remove(@Param('productId', ParseIntPipe) productId: number, @Request() req: AuthenticatedRequest) {
    return this.favoritesService.remove(req.user.sub, productId);
  }
}
