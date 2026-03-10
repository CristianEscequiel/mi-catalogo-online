import { Type } from 'class-transformer';
import { IsString, IsEmail, IsNotEmpty, MinLength, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Role } from 'src/auth/roles/roles.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'StrongPass123',
    required: true,
  })
  password: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'User email address',
    example: 'ana.gomez@example.com',
    required: true,
  })
  email: string;

  @IsOptional()
  @IsEnum(Role)
  @ApiPropertyOptional({
    description: 'User role',
    enum: Role,
    example: Role.ADMIN,
  })
  role?: Role;

  @ValidateNested()
  @Type(() => CreateProfileDto)
  @IsNotEmpty()
  @ApiProperty({
    description: 'User profile information',
    type: () => CreateProfileDto,
    example: {
      name: 'Ana',
      lastName: 'Gomez',
      avatar: 'https://example.com/avatars/ana.png',
    },
    required: true,
  })
  profile: CreateProfileDto;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['profile'])) {
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User profile updates',
    type: () => UpdateProfileDto,
    example: {
      name: 'Ana',
      lastName: 'Gomez',
      avatar: 'https://example.com/avatars/ana.png',
    },
  })
  profile: UpdateProfileDto;
}
