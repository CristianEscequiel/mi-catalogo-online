import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../models/status.enum';

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
  description: string;

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

  @IsEnum(Status)
  @ApiProperty({ description: '' })
  status: Status;
}
