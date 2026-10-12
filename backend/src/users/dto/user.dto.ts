import { Type } from 'class-transformer';
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { CreateProfileDto, UpdateProfileDto } from './profile.dto';
import { Role } from 'src/auth/roles/roles.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Solo campos que puede mandar un cliente. Los campos internos (emailVerified, tokens)
// nunca deben poder fijarse desde la API: ver CreateUserData en users.service.ts.
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignora lo que exceda los 72 bytes
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
    description: 'User role (solo lo respeta el alta hecha por un ADMIN)',
    enum: Role,
    example: Role.CLIENT,
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
  profile?: CreateProfileDto;
}

// Un usuario solo puede cambiar su contraseña y su perfil. El email y el rol tienen flujos propios.
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @ApiPropertyOptional({ description: 'New password (min 8 characters)' })
  password?: string;

  @ValidateNested()
  @Type(() => UpdateProfileDto)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'User profile updates',
    type: () => UpdateProfileDto,
    example: { name: 'Ana', lastName: 'Gomez' },
  })
  profile?: UpdateProfileDto;
}

export class UpdateUserRoleDto {
  @IsEnum(Role)
  @ApiProperty({ enum: Role, example: Role.CLIENT })
  role: Role;
}
