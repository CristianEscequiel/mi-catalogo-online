import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DEFAULT_ORDERS_LIMIT = 10;
export const MAX_ORDERS_LIMIT = 50;

export class ListMyOrdersQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Page number (starts at 1)', default: 1, example: 1 })
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ORDERS_LIMIT)
  @ApiPropertyOptional({ description: 'Items per page', default: DEFAULT_ORDERS_LIMIT, maximum: MAX_ORDERS_LIMIT, example: 10 })
  limit: number = DEFAULT_ORDERS_LIMIT;
}
