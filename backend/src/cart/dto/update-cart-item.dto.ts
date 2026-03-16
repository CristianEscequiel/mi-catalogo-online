import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: 'Desired quantity for the cart item',
    example: 2,
    required: true,
    minimum: 1,
  })
  quantity: number;
}
