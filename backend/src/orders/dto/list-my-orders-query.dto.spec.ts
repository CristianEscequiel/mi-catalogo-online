import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ListMyOrdersQueryDto } from './list-my-orders-query.dto';

// Mismo ValidationPipe que app.setup.ts; los parámetros de query llegan siempre como texto.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const parse = (query: Record<string, string>) => pipe.transform(query, { type: 'query', metatype: ListMyOrdersQueryDto }) as Promise<ListMyOrdersQueryDto>;

describe('ListMyOrdersQueryDto', () => {
  it('REQ-1.5: sin parámetros usa page 1 y limit 10', async () => {
    const dto = await parse({});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('REQ-1.5: acepta page y limit explícitos, con limit 50 como tope válido', async () => {
    const dto = await parse({ page: '3', limit: '50' });
    expect(dto).toMatchObject({ page: 3, limit: 50 });
  });

  it.each([
    ['page 0', { page: '0' }],
    ['page negativa', { page: '-1' }],
    ['page decimal', { page: '1.5' }],
    ['page no numérica', { page: 'abc' }],
    ['limit 0', { limit: '0' }],
    ['limit negativo', { limit: '-5' }],
    ['limit decimal', { limit: '1.5' }],
    ['limit mayor que 50', { limit: '51' }],
    ['limit no numérico', { limit: 'abc' }],
  ])('REQ-1.6: rechaza %s', async (_label, query) => {
    await expect(parse(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
