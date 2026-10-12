import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token de verificación recibido por email' })
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token: string;
}
