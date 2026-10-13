import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por email', example: 'a1b2...' })
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignora lo que exceda los 72 bytes
  newPassword: string;
}
