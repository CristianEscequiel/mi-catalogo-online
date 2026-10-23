import { DatePipe, DecimalPipe } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { BANK_TRANSFER_DATA } from '../../core/config/bank-transfer.config';
import { OrderResponse, OrdersService } from '../../core/services/orders.service';
import { OrderDetailPage } from './order-detail-page';

const order = (status: OrderResponse['status'] = 'PENDING_PAYMENT'): OrderResponse => ({
  id: 12,
  status,
  customerName: 'Ana Gómez',
  customerEmail: 'ana@example.com',
  customerAddress: 'Calle 123, Ciudad',
  total: 1450,
  createdAt: '2026-10-16T10:00:00Z',
  items: [
    { productId: 1, productName: 'Remera lisa', unitPrice: 300, quantity: 3, subtotal: 900 },
    { productId: 2, productName: 'Gorra azul', unitPrice: 550, quantity: 1, subtotal: 550 },
  ],
  allowedTransitions: [],
});

describe('OrderDetailPage', () => {
  let fixture: ComponentFixture<OrderDetailPage>;
  let response: Subject<OrderResponse>;
  let getOrderById: jasmine.Spy;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const hrefs = () => Array.from(el().querySelectorAll('a')).map((a) => a.getAttribute('href'));
  const fmt = (n: number) => new DecimalPipe('en-US').transform(n, '1.0-0') as string;

  const create = async (id: string | null = '12') => {
    TestBed.configureTestingModule({
      imports: [OrderDetailPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } } },
        { provide: OrdersService, useValue: { getOrderById } },
      ],
    });
    fixture = TestBed.createComponent(OrderDetailPage);
    fixture.detectChanges();
    await settle();
  };
  const load = async (value: OrderResponse) => {
    response.next(value);
    response.complete();
    await settle();
  };

  beforeEach(() => {
    response = new Subject<OrderResponse>();
    getOrderById = jasmine.createSpy('getOrderById').and.returnValue(response);
  });

  it('REQ-4.2: mientras carga el pedido muestra un indicador de carga', async () => {
    await create();

    expect(getOrderById).toHaveBeenCalledWith(12);
    expect(el().querySelector('.loading') !== null || /cargando/i.test(text())).toBeTrue();
  });

  it('REQ-4.3: muestra número, estado, fecha, nombre, email, dirección y total', async () => {
    await create();
    await load(order('PAID'));

    expect(text()).toContain('#12');
    expect(text()).toContain('Pagado');
    expect(text()).toContain(new DatePipe('en-US').transform('2026-10-16T10:00:00Z', 'short') as string);
    expect(text()).toContain('Ana Gómez');
    expect(text()).toContain('ana@example.com');
    expect(text()).toContain('Calle 123, Ciudad');
    expect(text()).toContain(`$ ${fmt(1450)}`);
  });

  it('REQ-4.4: muestra cada línea con producto, cantidad, precio unitario y subtotal', async () => {
    await create();
    await load(order('PAID'));

    expect(text()).toContain('Remera lisa');
    expect(text()).toContain('Gorra azul');
    expect(text()).toContain(`$ ${fmt(300)}`);
    expect(text()).toContain(`$ ${fmt(900)}`);
    expect(text()).toContain(`$ ${fmt(550)}`);
    expect(text()).toMatch(/\b3\b/);
  });

  it('REQ-4.5: un pedido PENDING_PAYMENT muestra los datos de transferencia', async () => {
    await create();
    await load(order('PENDING_PAYMENT'));

    expect(el().querySelector('app-order-payment-info')).not.toBeNull();
    expect(text()).toContain(BANK_TRANSFER_DATA.alias);
    expect(text()).toContain(BANK_TRANSFER_DATA.cbu);
    expect(text()).toContain(BANK_TRANSFER_DATA.holder);
    expect(text()).toContain(BANK_TRANSFER_DATA.bank);
  });

  it('REQ-4.6: un pedido PENDING_PAYMENT muestra el botón que abre WhatsApp', async () => {
    await create();
    await load(order('PENDING_PAYMENT'));

    const link = Array.from(el().querySelectorAll('a')).find((a) => (a.textContent ?? '').includes('Enviar pedido por WhatsApp'));
    expect(link?.getAttribute('href')).toContain('https://wa.me/');
  });

  for (const status of ['PAID', 'CANCELLED', 'DELIVERED'] as const) {
    it(`REQ-4.7: un pedido ${status} no muestra datos de transferencia ni WhatsApp`, async () => {
      await create();
      await load(order(status));

      expect(text()).toContain('#12'); // el pedido sí se renderizó
      expect(el().querySelector('app-order-payment-info')).toBeNull();
      expect(text()).not.toContain('Datos de transferencia');
      expect(text()).not.toContain('WhatsApp');
    });
  }

  it('REQ-4.8: si el backend responde 404 muestra "No pudimos cargar este pedido"', async () => {
    await create();
    response.error({ status: 404 });
    await settle();

    expect(text()).toContain('No pudimos cargar este pedido');
  });

  it('REQ-4.8: ante un error de red también muestra "No pudimos cargar este pedido"', async () => {
    await create();
    response.error(new Error('network'));
    await settle();

    expect(text()).toContain('No pudimos cargar este pedido');
  });

  it('REQ-4.9: si falla la carga muestra un enlace a /orders', async () => {
    await create();
    response.error({ status: 404 });
    await settle();

    expect(hrefs()).toContain('/orders');
  });

  for (const badId of ['abc', '0', '-3', '1.5']) {
    it(`REQ-4.10: el id "${badId}" muestra el error sin llamar al backend`, async () => {
      await create(badId);

      expect(getOrderById).not.toHaveBeenCalled();
      expect(text()).toContain('No pudimos cargar este pedido');
    });
  }

  it('REQ-4.11: ofrece un enlace "Volver a mis pedidos" hacia /orders', async () => {
    await create();
    await load(order('PAID'));

    const back = Array.from(el().querySelectorAll('a')).find((a) => (a.textContent ?? '').includes('Volver a mis pedidos'));
    expect(back).withContext('no existe el enlace "Volver a mis pedidos"').toBeDefined();
    expect(back?.getAttribute('href')).toBe('/orders');
  });
});
