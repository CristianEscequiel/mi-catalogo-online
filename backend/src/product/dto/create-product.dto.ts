import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '' })
  slug?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '' })
  description?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '' })
  sku: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '' })
  price?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @ApiProperty({ description: '' })
  categoryIds?: number[];

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '' })
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '' })
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
