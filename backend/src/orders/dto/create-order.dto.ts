import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Customer full name', example: 'Ana Gomez', required: true })
  name: string;

  @IsEmail()
  @ApiProperty({ description: 'Customer email', example: 'ana.gomez@example.com', required: true })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Shipping address', example: 'Av. Siempre Viva 742', required: true })
  address: string;
}
