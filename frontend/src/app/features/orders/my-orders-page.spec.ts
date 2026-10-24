import { DatePipe, DecimalPipe } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { NotificationService } from '../../core/services/notification.service';
import { MyOrderSummary, MyOrdersResponse, OrdersService } from '../../core/services/orders.service';
import { MyOrdersPage } from './my-orders-page';

const summary = (id: number, status: MyOrderSummary['status'] = 'PENDING_PAYMENT', extra: Partial<MyOrderSummary> = {}): MyOrderSummary => ({
  id,
  status,
  total: 1500,
  createdAt: '2026-10-16T10:00:00Z',
  itemCount: 7,
  ...extra,
});

const pageOf = (items: MyOrderSummary[], page: number, totalPages: number): MyOrdersResponse => ({
  items,
  total: items.length,
  page,
  limit: 10,
  totalPages,
});

describe('MyOrdersPage', () => {
  let fixture: ComponentFixture<MyOrdersPage>;
  let responses: Subject<MyOrdersResponse>[];
  let getMyOrders: jasmine.Spy;
  let notifyError: jasmine.Spy;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (label: string) => Array.from(el().querySelectorAll('button')).find((b) => (b.textContent ?? '').includes(label));
  const respond = async (index: number, value: MyOrdersResponse) => {
    responses[index].next(value);
    responses[index].complete();
    await settle();
  };

  const create = async () => {
    fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    responses = [];
    getMyOrders = jasmine.createSpy('getMyOrders').and.callFake(() => {
      const subject = new Subject<MyOrdersResponse>();
      responses.push(subject);
      return subject;
    });
    notifyError = jasmine.createSpy('error');
    TestBed.configureTestingModule({
      imports: [MyOrdersPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrdersService, useValue: { getMyOrders } },
        { provide: NotificationService, useValue: { error: notifyError, success: () => undefined, info: () => undefined } },
      ],
    });
  });

  it('REQ-3.2: mientras carga la primera página muestra un indicador de carga', async () => {
    await create();

    expect(el().querySelector('.loading') !== null || /cargando/i.test(text())).toBeTrue();
    expect(getMyOrders).toHaveBeenCalledTimes(1);
    expect(getMyOrders.calls.mostRecent().args[0]).toBe(1);
  });

  it('REQ-3.3: por cada pedido muestra número, fecha, estado, total y cantidad de productos', async () => {
    await create();
    await respond(0, pageOf([summary(12, 'PAID', { total: 2345, itemCount: 7 })], 1, 1));

    const date = new DatePipe('en-US').transform('2026-10-16T10:00:00Z', 'short') as string;
    const total = new DecimalPipe('en-US').transform(2345, '1.0-0') as string;
    expect(text()).toContain('#12');
    expect(text()).toContain(date);
    expect(text()).toContain('Pagado');
    expect(text()).toContain(`$ ${total}`);
    expect(text()).toContain('7 productos');
    expect(text()).not.toContain('Cargando');
  });

  it('REQ-3.4: cada pedido enlaza a /orders/:id', async () => {
    await create();
    await respond(0, pageOf([summary(12), summary(8)], 1, 1));

    const hrefs = Array.from(el().querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/orders/12');
    expect(hrefs).toContain('/orders/8');
  });

  it('REQ-3.5: usa una etiqueta de texto para cada estado', async () => {
    await create();
    await respond(0, pageOf([summary(1, 'PENDING_PAYMENT'), summary(2, 'PAID'), summary(3, 'CANCELLED'), summary(4, 'DELIVERED')], 1, 1));

    for (const label of ['Esperando transferencia', 'Pagado', 'Cancelado', 'Entregado']) {
      expect(text()).withContext(label).toContain(label);
    }
  });

  it('REQ-3.6: sin pedidos muestra "Todavía no hiciste pedidos"', async () => {
    await create();
    await respond(0, pageOf([], 1, 0));

    expect(text()).toContain('Todavía no hiciste pedidos');
  });

  it('REQ-3.7: sin pedidos muestra un enlace al catálogo', async () => {
    await create();
    await respond(0, pageOf([], 1, 0));

    const hrefs = Array.from(el().querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/home');
  });

  it('REQ-3.8: si falla la primera página muestra un mensaje de error y el botón Reintentar', async () => {
    await create();
    responses[0].error(new Error('boom'));
    await settle();

    expect(text()).toMatch(/no pudimos|error/i);
    expect(button('Reintentar')).toBeDefined();
    expect(text()).not.toContain('Todavía no hiciste pedidos');
  });

  it('REQ-3.9: Reintentar repite la petición de la primera página', async () => {
    await create();
    responses[0].error(new Error('boom'));
    await settle();

    button('Reintentar')?.click();
    await settle();

    expect(getMyOrders).toHaveBeenCalledTimes(2);
    expect(getMyOrders.calls.mostRecent().args[0]).toBe(1);
    await respond(1, pageOf([summary(5)], 1, 1));
    expect(text()).toContain('#5');
  });

  it('REQ-3.10: muestra "Cargar más" si page < totalPages y no en la última página', async () => {
    await create();
    await respond(0, pageOf([summary(20)], 1, 2));
    expect(button('Cargar más')).toBeDefined();

    button('Cargar más')?.click();
    await settle();
    await respond(1, pageOf([summary(10)], 2, 2));

    expect(button('Cargar más')).toBeUndefined();
  });

  it('REQ-3.10: con una sola página no muestra "Cargar más"', async () => {
    await create();
    await respond(0, pageOf([summary(20)], 1, 1));

    expect(button('Cargar más')).toBeUndefined();
  });

  it('REQ-3.11: "Cargar más" pide la página siguiente', async () => {
    await create();
    await respond(0, pageOf([summary(20)], 1, 3));

    button('Cargar más')?.click();
    await settle();

    expect(getMyOrders).toHaveBeenCalledTimes(2);
    expect(getMyOrders.calls.mostRecent().args[0]).toBe(2);
  });

  it('REQ-3.12: los pedidos de la página siguiente se agregan a continuación de los ya mostrados', async () => {
    await create();
    await respond(0, pageOf([summary(20)], 1, 2));
    button('Cargar más')?.click();
    await settle();
    await respond(1, pageOf([summary(10)], 2, 2));

    const hrefs = Array.from(el().querySelectorAll('a'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h?.startsWith('/orders/'));
    expect(hrefs).toEqual(['/orders/20', '/orders/10']);
  });

  it('REQ-3.13: mientras la página siguiente está en curso, "Cargar más" queda deshabilitado', async () => {
    await create();
    await respond(0, pageOf([summary(20)], 1, 2));

    button('Cargar más')?.click();
    await settle();

    expect(button('Cargar más')?.disabled).toBeTrue();
  });

  it('REQ-3.14: si falla "Cargar más" avisa del error y conserva los pedidos mostrados', async () => {
    await create();
    await respond(0, pageOf([summary(20)], 1, 2));

    button('Cargar más')?.click();
    await settle();
    responses[1].error(new Error('boom'));
    await settle();

    expect(notifyError).toHaveBeenCalled();
    expect(text()).toContain('#20');
  });
});
