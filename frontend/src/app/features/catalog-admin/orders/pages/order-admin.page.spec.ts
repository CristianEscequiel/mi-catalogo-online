import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NotificationService } from '../../../../core/services/notification.service';
import { OrderResponse, OrderStatus, OrderSummaryResponse } from '../../../../core/services/orders.service';
import { OrderAdminPage } from './order-admin.page';

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const summary = (id: number, status: OrderStatus): OrderSummaryResponse => ({
  id,
  customerName: 'Ana',
  customerEmail: 'ana@test.local',
  total: 100,
  status,
  createdAt: '2026-10-01T10:00:00Z',
  allowedTransitions: NEXT[status],
});

const detail = (id: number, status: OrderStatus): OrderResponse => ({
  ...summary(id, status),
  customerAddress: 'Calle 1',
  items: [{ productId: 1, productName: 'Lapicera', unitPrice: 50, quantity: 2, subtotal: 100 }],
});

describe('OrderAdminPage (transiciones de estado)', () => {
  let fixture: ComponentFixture<OrderAdminPage>;
  let page: OrderAdminPage;
  let http: HttpTestingController;
  let notifications: NotificationService;

  const urlEndsWith = (suffix: string) => (req: { url: string }) => req.url.endsWith(suffix);

  const stable = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  // Crea la página con una orden en `status` ya seleccionada.
  const openOrder = async (status: OrderStatus) => {
    fixture = TestBed.createComponent(OrderAdminPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(urlEndsWith('/orders')).flush([summary(1, status)]);
    await stable();

    const pending = page.selectOrder(1);
    http.expectOne(urlEndsWith('/orders/1')).flush(detail(1, status));
    await pending;
    await stable();
  };

  const actionButtons = () => Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button.status-action'));
  const labels = () => actionButtons().map((button) => button.textContent?.trim());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrderAdminPage],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    http.verify();
  });

  it('PENDING_PAYMENT ofrece solo Pagado y Cancelar (REQ-6.1)', async () => {
    await openOrder('PENDING_PAYMENT');
    expect(labels()).toEqual(['Marcar como pagado', 'Cancelar pedido']);
  });

  it('PAID ofrece solo Entregado y Cancelar (REQ-6.1)', async () => {
    await openOrder('PAID');
    expect(labels()).toEqual(['Marcar como entregado', 'Cancelar pedido']);
  });

  it('no ofrece ningún cambio de estado en DELIVERED ni en CANCELLED (REQ-6.2)', async () => {
    for (const status of ['DELIVERED', 'CANCELLED'] as const) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [OrderAdminPage],
        providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
      });
      http = TestBed.inject(HttpTestingController);

      await openOrder(status);

      expect(actionButtons().length).withContext(status).toBe(0);
      expect(fixture.nativeElement.querySelector('.status-final')).withContext(status).not.toBeNull();
      http.verify();
    }
  });

  it('al avanzar de estado envía el PATCH y actualiza las acciones y la lista (REQ-6.1)', async () => {
    await openOrder('PENDING_PAYMENT');

    actionButtons()[0].click(); // Marcar como pagado
    const req: TestRequest = http.expectOne(urlEndsWith('/orders/1/status'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'PAID' });
    req.flush({ id: 1, status: 'PAID', allowedTransitions: NEXT.PAID });
    await stable();

    expect(labels()).toEqual(['Marcar como entregado', 'Cancelar pedido']);
    expect(page.orders()[0].status).toBe('PAID');
    expect(page.orders()[0].allowedTransitions).toEqual(NEXT.PAID);
  });

  it('un 409 muestra un error y vuelve a pedir la orden con su estado real (REQ-6.3, 6.4)', async () => {
    const errorSpy = spyOn(notifications, 'error');
    await openOrder('PENDING_PAYMENT');

    actionButtons()[0].click(); // otro admin ya la canceló
    http.expectOne(urlEndsWith('/orders/1/status')).flush({ message: 'Cannot change order from CANCELLED to PAID' }, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();

    // REQ-6.4: recarga el detalle y la lista
    http.expectOne(urlEndsWith('/orders/1')).flush(detail(1, 'CANCELLED'));
    http.expectOne(urlEndsWith('/orders')).flush([summary(1, 'CANCELLED')]);
    await stable();

    expect(errorSpy).toHaveBeenCalledTimes(1); // REQ-6.3
    expect(errorSpy.calls.mostRecent().args[0]).toContain('cambió');
    expect(page.selectedOrder()?.status).toBe('CANCELLED');
    expect(actionButtons().length).toBe(0);
  });

  it('un error distinto de 409 muestra un error genérico y no recarga', async () => {
    const errorSpy = spyOn(notifications, 'error');
    await openOrder('PAID');

    actionButtons()[0].click();
    http.expectOne(urlEndsWith('/orders/1/status')).flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await stable();

    expect(errorSpy).toHaveBeenCalledWith('No se pudo actualizar el estado del pedido.');
    http.expectNone(urlEndsWith('/orders/1'));
    expect(page.selectedOrder()?.status).toBe('PAID');
  });

  it('ignora una transición que el backend no listó como permitida', async () => {
    await openOrder('DELIVERED');

    await page.updateSelectedOrderStatus('PENDING_PAYMENT');

    expect(http.match(urlEndsWith('/orders/1/status'))).toEqual([]);
  });
});
