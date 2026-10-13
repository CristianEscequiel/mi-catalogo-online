import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Status } from '../models/status.enum';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

const base = { name: 'Teclado', status: Status.DRAFT };
const errorsFor = async (cls: new () => object, body: object) => (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe.each([
  ['CreateProductDto', CreateProductDto],
  ['UpdateProductDto', UpdateProductDto],
])('%s (precio y stock)', (_name, cls) => {
  it.each([
    ['precio negativo', { price: -1 }, 'price'],
    ['precio con 3 decimales', { price: 1.999 }, 'price'],
    ['stock negativo', { stock: -1 }, 'stock'],
    ['stock decimal', { stock: 1.5 }, 'stock'],
  ])('rechaza %s (REQ-2.4, REQ-1.6)', async (_label, extra, property) => {
    expect(await errorsFor(cls, { ...base, ...extra })).toContain(property);
  });

  it('acepta precio con centavos y stock 0', async () => {
    expect(await errorsFor(cls, { ...base, price: 10.5, stock: 0 })).toEqual([]);
  });

  it('acepta precio 0 en catálogo (la orden lo rechaza, REQ-2.5)', async () => {
    expect(await errorsFor(cls, { ...base, price: 0 })).toEqual([]);
  });
});
