import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'First name',
    example: 'Ana',
    required: true,
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Last name',
    example: 'Gomez',
    required: true,
  })
  lastName: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Profile avatar URL',
    example: 'https://example.com/avatars/ana.png',
  })
  avatar?: string;
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
