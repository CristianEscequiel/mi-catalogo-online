import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({
    description: 'Category name',
    example: 'Keyboards',
    required: true,
  })
  name: string;

  @IsString()
  @MaxLength(100)
  @ApiProperty({
    description: 'Short category description',
    example: 'Mechanical keyboards and accessories',
    required: true,
  })
  description: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'Parent category ID',
    example: 1,
  })
  parentId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://example.com/images/categories/keyboards.png',
  })
  imageUrl?: string;
}
