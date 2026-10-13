import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListProductsQueryDto } from './list-products-query.dto';

// Mismo ValidationPipe que main.ts; los parámetros de query llegan siempre como texto.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const parse = (query: Record<string, string>) => pipe.transform(query, { type: 'query', metatype: ListProductsQueryDto }) as Promise<ListProductsQueryDto>;

describe('ListProductsQueryDto', () => {
  it('sin parámetros usa page 1 y limit 12 (REQ-2.2)', async () => {
    const dto = await parse({});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(12);
    expect(dto.search).toBeUndefined();
    expect(dto.categoryId).toBeUndefined();
  });

  it.each([
    ['limit mayor que 50', { limit: '51' }],
    ['limit 0', { limit: '0' }],
    ['limit decimal', { limit: '1.5' }],
    ['limit no numérico', { limit: 'abc' }],
    ['page 0', { page: '0' }],
    ['page negativa', { page: '-1' }],
    ['page decimal', { page: '1.5' }],
    ['categoryId 0', { categoryId: '0' }],
    ['categoryId no numérico', { categoryId: 'abc' }],
    ['search de 101 caracteres', { search: 'a'.repeat(101) }],
    ['parámetro desconocido', { sort: 'price' }],
  ])('rechaza %s (REQ-2.3, 2.5, 2.7)', async (_label, query) => {
    await expect(parse(query)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acepta los límites: limit 50 y search de 100 caracteres', async () => {
    const dto = await parse({ limit: '50', search: 'a'.repeat(100), page: '3', categoryId: '7' });
    expect(dto).toMatchObject({ limit: 50, page: 3, categoryId: 7 });
    expect(dto.search).toHaveLength(100);
  });

  it('un search vacío o de espacios cuenta como ausente y se recorta el resto', async () => {
    expect((await parse({ search: '   ' })).search).toBeUndefined();
    expect((await parse({ search: '' })).search).toBeUndefined();
    expect((await parse({ search: ' tecl ' })).search).toBe('tecl');
  });
});
