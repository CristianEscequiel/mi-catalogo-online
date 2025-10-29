import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The title of the post' })
  title: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The content of the post' })
  content: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The coverImage of the post' })
  coverImage: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The summay of the post' })
  summary: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'The draft of the post' })
  isDraft?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @ApiProperty({ description: 'The category of the post' })
  categoryIds?: number[];
}
