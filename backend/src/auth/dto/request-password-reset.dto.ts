import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'ana.gomez@example.com' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
