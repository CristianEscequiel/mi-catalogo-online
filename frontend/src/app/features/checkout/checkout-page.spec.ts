import { provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { OrderResponse, OrdersService } from '../../core/services/orders.service';
import { AuthStore } from '../../core/state/auth.store';
import { CartItem, CartStore } from '../../core/state/cart.store';
import { CheckoutPage } from './checkout-page';

const cartItem: CartItem = { productId: 1, name: 'Remera lisa', price: 100, qty: 2, stock: 5, thumbnailUrl: null };

describe('CheckoutPage (estados)', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let items: ReturnType<typeof signal<CartItem[]>>;
  let loadCart: jasmine.Spy;
  let resolveLoad: () => void;
  let rejectLoad: (reason?: unknown) => void;
  let placeOrder: Subject<OrderResponse>;
  let navigate: jasmine.Spy;

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const field = (id: string) => el().querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const type = (id: string, value: string) => {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const createLoaded = async () => {
    fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    await settle();
    items.set([cartItem]);
    resolveLoad();
    await settle();
  };

  const fillAndSubmit = async () => {
    type('checkout-name', 'Ana Gómez');
    type('checkout-email', 'ana@example.com');
    type('checkout-address', 'Calle 123, Ciudad');
    submitButton().click();
    await settle();
  };

  beforeEach(() => {
    spyOn(console, 'error');
    items = signal<CartItem[]>([]);
    placeOrder = new Subject<OrderResponse>();
    loadCart = jasmine.createSpy('loadCart').and.callFake(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveLoad = resolve;
          rejectLoad = reject;
        }),
    );
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrdersService, useValue: { placeOrder: () => placeOrder } },
        { provide: AuthStore, useValue: { userProfile: () => null, userLite: () => null } },
        { provide: CartStore, useValue: { items, total: () => 200, loadCart } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('REQ-2.2: mientras carga el carrito muestra el esqueleto', async () => {
    fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    await settle();

    expect(el().querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(el().querySelector('form')).toBeNull();
  });

  it('REQ-2.2: si falla la carga del carrito muestra el error', async () => {
    fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    await settle();

    rejectLoad(new Error('boom'));
    await settle();

    expect(el().textContent).toContain('No pudimos cargar el resumen del carrito.');
  });

  it('REQ-2.2: al cargar el carrito muestra el formulario con "Finalizar pedido" deshabilitado hasta completarlo', async () => {
    await createLoaded();

    expect(el().querySelector('form')).not.toBeNull();
    expect(submitButton().textContent).toContain('Finalizar pedido');
    expect(submitButton().disabled).toBeTrue();

    type('checkout-name', 'Ana Gómez');
    type('checkout-email', 'ana@example.com');
    type('checkout-address', 'Calle 123, Ciudad');

    expect(submitButton().disabled).toBeFalse();
  });

  it('REQ-2.2: al enviar muestra "Procesando pedido..." con el botón deshabilitado', async () => {
    await createLoaded();

    await fillAndSubmit();

    expect(submitButton().textContent).toContain('Procesando pedido...');
    expect(submitButton().disabled).toBeTrue();
  });

  it('REQ-2.2: al confirmarse el pedido recarga el carrito y navega a la pantalla de éxito', async () => {
    await createLoaded();
    await fillAndSubmit();

    placeOrder.next({ id: 12 } as OrderResponse);
    await settle();
    resolveLoad(); // el carrito se vuelve a pedir tras crear la orden
    await settle();

    expect(loadCart).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledOnceWith(['/checkout/success', 12]);
  });

  it('REQ-2.2: si el backend rechaza el pedido muestra su mensaje y vuelve a habilitar el botón', async () => {
    await createLoaded();
    await fillAndSubmit();

    placeOrder.error(new HttpErrorResponse({ status: 409, error: { message: 'Sin stock de Remera lisa' } }));
    await settle();

    expect(el().textContent).toContain('Sin stock de Remera lisa');
    expect(submitButton().textContent).toContain('Finalizar pedido');
    expect(submitButton().disabled).toBeFalse();
  });
});
