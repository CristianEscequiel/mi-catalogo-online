import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { OrderResponse, OrdersService } from '../../core/services/orders.service';
import { CheckoutSuccessPage } from './checkout-success-page';

const order: OrderResponse = {
  id: 12,
  status: 'PENDING_PAYMENT',
  customerName: 'Ana Gómez',
  customerEmail: 'ana@example.com',
  customerAddress: 'Calle 123, Ciudad',
  total: 300,
  createdAt: '2026-10-16T10:00:00Z',
  items: [{ productId: 1, productName: 'Remera lisa', unitPrice: 100, quantity: 3, subtotal: 300 }],
  allowedTransitions: ['PAID', 'CANCELLED'],
};

describe('CheckoutSuccessPage (estados)', () => {
  let fixture: ComponentFixture<CheckoutSuccessPage>;
  let response: Subject<OrderResponse>;

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const create = async () => {
    fixture = TestBed.createComponent(CheckoutSuccessPage);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    response = new Subject<OrderResponse>();
    TestBed.configureTestingModule({
      imports: [CheckoutSuccessPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ orderId: '12' }) } } },
        { provide: OrdersService, useValue: { getOrderById: () => response } },
      ],
    });
  });

  it('REQ-2.2: mientras carga muestra "Cargando detalle del pedido..."', async () => {
    await create();

    expect(el().textContent).toContain('Cargando detalle del pedido...');
  });

  it('REQ-2.2: al llegar el pedido muestra su número y el estado "Esperando transferencia"', async () => {
    await create();

    response.next(order);
    response.complete();
    await settle();

    expect(el().textContent).toContain('Pedido generado correctamente');
    expect(el().textContent).toContain('#12');
    expect(el().textContent).toContain('Esperando transferencia');
    expect(el().textContent).not.toContain('Cargando detalle del pedido...');
  });

  it('REQ-2.2: si falla la carga muestra "No pudimos cargar este pedido."', async () => {
    await create();

    response.error(new Error('boom'));
    await settle();

    expect(el().textContent).toContain('No pudimos cargar este pedido.');
  });
});
