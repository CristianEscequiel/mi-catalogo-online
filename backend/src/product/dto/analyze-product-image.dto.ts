import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { GenerateProductFromImageCategoryDto } from './generate-product-from-image.dto';

// multipart entrega texto: se interpreta el JSON y cada elemento se instancia para que
// @ValidateNested lo valide. Si no se puede interpretar, se deja el valor y @IsArray falla (400).
const parseCategories = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return value;
  }
  return Array.isArray(parsed) ? plainToInstance(GenerateProductFromImageCategoryDto, parsed) : parsed;
};

export class AnalyzeProductImageDto {
  @ApiProperty({
    type: String,
    description: 'JSON con la lista de categorías disponibles (id y name)',
    example: '[{"id":1,"name":"Teclados"}]',
  })
  @Transform(({ value }) => parseCategories(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  categories: GenerateProductFromImageCategoryDto[];
}
