import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

export class GenerateProductFromImageCategoryDto {
  @ApiProperty({
    description: 'Category id',
    example: 1,
  })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({
    description: 'Category name',
    example: 'Teclados',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class GenerateProductFromImageDto {
  @ApiProperty({
    description: 'Public product image URL/path to analyze',
    example: '/uploads/products/10-1775070769661.jpg',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({
    description: 'Available categories to constrain AI selection',
    type: [GenerateProductFromImageCategoryDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GenerateProductFromImageCategoryDto)
  categories: GenerateProductFromImageCategoryDto[];
}
