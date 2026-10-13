import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { CartService } from './cart.service';
import { CartItem } from './entities/cart-item.entity';

const cartRow = (productId: number, price: number | null, quantity: number) => ({ productId, quantity, product: { name: `P${productId}`, price, stock: 99, thumbnailUrl: null } }) as unknown as CartItem;

describe('CartService (dinero exacto)', () => {
  let service: CartService;
  const cartRepository = { find: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [CartService, { provide: getRepositoryToken(CartItem), useValue: cartRepository }, { provide: getRepositoryToken(Product), useValue: {} }],
    }).compile();
    service = moduleRef.get(CartService);
  });

  it('3 unidades a 0.10 → subtotal 0.3 exacto (REQ-2.2)', async () => {
    cartRepository.find.mockResolvedValue([cartRow(1, 0.1, 3)]);

    const cart = await service.findAllByUser(1);

    expect(0.1 * 3).not.toBe(0.3); // lo que daba antes
    expect(cart.items[0].subtotal).toBe(0.3);
    expect(cart.total).toBe(0.3);
  });

  it('el total suma subtotales sin error de punto flotante: 0.1 + 0.2 → 0.3 (REQ-2.2)', async () => {
    cartRepository.find.mockResolvedValue([cartRow(1, 0.1, 1), cartRow(2, 0.2, 1)]);

    expect((await service.findAllByUser(1)).total).toBe(0.3);
  });

  it('mantiene la forma de la respuesta actual (REQ-2.3)', async () => {
    cartRepository.find.mockResolvedValue([cartRow(7, 19.99, 2)]);

    expect(await service.findAllByUser(1)).toEqual({
      items: [{ productId: 7, name: 'P7', price: 19.99, quantity: 2, stock: 99, thumbnailUrl: null, subtotal: 39.98 }],
      total: 39.98,
    });
  });

  it('un carrito vacío da total 0', async () => {
    cartRepository.find.mockResolvedValue([]);
    expect(await service.findAllByUser(1)).toEqual({ items: [], total: 0 });
  });
});
