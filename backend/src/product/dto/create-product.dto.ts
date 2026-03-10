import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../models/status.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Product name',
    example: 'Mechanical Keyboard',
    required: true,
  })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'URL-friendly slug for the product',
    example: 'mechanical-keyboard',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Product description',
    example: 'RGB mechanical keyboard',
  })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Stock keeping unit (SKU)',
    example: 'MK-001',
  })
  sku?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Product price',
    example: 120,
  })
  price?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Product stock',
    example: 120,
  })
  stock?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Product reserved stock',
    example: 120,
  })
  reservedStock?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Category IDs assigned to the product',
    type: [Number],
    example: [1, 2],
  })
  categoryIds?: number[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://example.com/images/keyboard.png',
  })
  thumbnailUrl?: string;

  @IsEnum(Status)
  @ApiProperty({
    description: 'Product status',
    enum: Status,
    example: Status.DRAFT,
    required: true,
  })
  status: Status;
}
