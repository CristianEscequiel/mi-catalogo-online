import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Los mensajes siguen el formato "<campo>: <texto>" para que el cliente pueda asignar
// cada error a su campo sin depender de los textos en ingles de class-validator.
export class CreateContactDto {
  @ApiProperty({ example: 'Ana Pérez', minLength: 2, maxLength: 80 })
  @Transform(trim)
  @IsString({ message: 'name: El nombre debe tener entre 2 y 80 caracteres' })
  @MinLength(2, { message: 'name: El nombre debe tener entre 2 y 80 caracteres' })
  @MaxLength(80, { message: 'name: El nombre debe tener entre 2 y 80 caracteres' })
  name: string;

  @ApiProperty({ example: 'ana@ejemplo.com', maxLength: 254 })
  @Transform(trim)
  @IsEmail({}, { message: 'email: Ingresá un email válido' })
  @MaxLength(254, { message: 'email: El email no puede superar los 254 caracteres' })
  email: string;

  @ApiProperty({ example: 'Hola, me gustaría hablar de un proyecto.', minLength: 10, maxLength: 2000 })
  @Transform(trim)
  @IsString({ message: 'message: El mensaje debe tener entre 10 y 2000 caracteres' })
  @MinLength(10, { message: 'message: El mensaje debe tener entre 10 y 2000 caracteres' })
  @MaxLength(2000, { message: 'message: El mensaje debe tener entre 10 y 2000 caracteres' })
  message: string;

  // Honeypot: los humanos no lo ven ni lo completan. Sin validacion de tipo ni de largo a
  // proposito, para que cualquier valor llegue al servicio y reciba la misma respuesta 201.
  @ApiPropertyOptional({ description: 'Campo trampa anti-spam; debe enviarse vacío.' })
  @IsOptional()
  website?: unknown;
}
