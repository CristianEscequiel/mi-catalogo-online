import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DEFAULT_PAGE_LIMIT = 12;
export const MAX_PAGE_LIMIT = 50;
export const MAX_SEARCH_LENGTH = 100;

export class ListProductsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Page number (starts at 1)', default: 1, example: 1 })
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  @ApiPropertyOptional({ description: 'Items per page', default: DEFAULT_PAGE_LIMIT, maximum: MAX_PAGE_LIMIT, example: 12 })
  limit: number = DEFAULT_PAGE_LIMIT;

  // Vacío o solo espacios cuenta como ausente.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH)
  @ApiPropertyOptional({ description: 'Text to look for in name and description', maxLength: MAX_SEARCH_LENGTH })
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ description: 'Only products of this category', example: 1 })
  categoryId?: number;
}
