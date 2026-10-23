import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AnalyzeProductImageDto } from './analyze-product-image.dto';
import { GenerateProductFromImageCategoryDto } from './generate-product-from-image.dto';

// Mismo ValidationPipe que app.setup.ts; en multipart `categories` llega siempre como texto.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const parse = (body: Record<string, unknown>) => pipe.transform(body, { type: 'body', metatype: AnalyzeProductImageDto }) as Promise<AnalyzeProductImageDto>;

describe('AnalyzeProductImageDto', () => {
  it('REQ-2.1: un JSON válido de categorías se convierte en instancias válidas', async () => {
    const dto = await parse({ categories: '[{"id":1,"name":"Teclados"},{"id":2,"name":"Mouses"}]' });
    expect(dto.categories).toHaveLength(2);
    expect(dto.categories[0]).toBeInstanceOf(GenerateProductFromImageCategoryDto);
    expect(dto.categories[1]).toMatchObject({ id: 2, name: 'Mouses' });
  });

  it.each([
    ['falta', {}],
    ['es una lista vacía', { categories: '[]' }],
    ['es texto vacío', { categories: '' }],
  ])('REQ-2.8: rechaza categories que %s', async (_label, body) => {
    await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['texto que no es JSON', 'no-es-json'],
    ['JSON truncado', '[{"id":1,'],
  ])('REQ-2.9: rechaza categories con %s', async (_label, categories) => {
    await expect(parse({ categories })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['un objeto en vez de lista', '{"id":1,"name":"Teclados"}'],
    ['un número', '5'],
    ['null', 'null'],
    ['elementos que no son objetos', '[1,2]'],
    ['id decimal', '[{"id":1.5,"name":"A"}]'],
    ['id 0', '[{"id":0,"name":"A"}]'],
    ['id negativo', '[{"id":-3,"name":"A"}]'],
    ['id como texto', '[{"id":"1","name":"A"}]'],
    ['name vacío', '[{"id":1,"name":""}]'],
    ['name numérico', '[{"id":1,"name":5}]'],
    ['falta name', '[{"id":1}]'],
    ['falta id', '[{"name":"A"}]'],
    ['un campo extra en un elemento', '[{"id":1,"name":"A","extra":true}]'],
    ['un elemento válido y otro inválido', '[{"id":1,"name":"A"},{"id":0,"name":"B"}]'],
  ])('REQ-2.10: rechaza categories con %s', async (_label, categories) => {
    await expect(parse({ categories })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('REQ-2.10: rechaza campos desconocidos en el cuerpo', async () => {
    await expect(parse({ categories: '[{"id":1,"name":"A"}]', otro: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
