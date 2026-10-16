import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartItem, CartStore } from '../../core/state/cart.store';
import { CartPage } from './cart-page';

const item = (productId: number, name: string): CartItem => ({ productId, name, price: 100, qty: 1, stock: 5, thumbnailUrl: null });

describe('CartPage (estados)', () => {
  let fixture: ComponentFixture<CartPage>;
  let items: ReturnType<typeof signal<CartItem[]>>;
  let loadCart: jasmine.Spy;
  let remove: jasmine.Spy;
  let resolveLoad: () => void;
  let rejectLoad: (reason?: unknown) => void;
  let resolveRemove: () => void;

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (text: string) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);

  const create = async () => {
    fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    spyOn(console, 'error');
    items = signal<CartItem[]>([]);
    loadCart = jasmine.createSpy('loadCart').and.callFake(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveLoad = resolve;
          rejectLoad = reject;
        }),
    );
    remove = jasmine.createSpy('remove').and.callFake(
      (productId: number) =>
        new Promise<void>((resolve) => {
          resolveRemove = () => {
            items.update((current) => current.filter((i) => i.productId !== productId));
            resolve();
          };
        }),
    );
    TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: CartStore, useValue: { items, total: () => 100, loadCart, remove, clear: () => Promise.resolve(), updateQuantity: () => Promise.resolve() } },
      ],
    });
  });

  it('REQ-2.2: mientras carga muestra el esqueleto y no el estado vacío', async () => {
    await create();

    expect(el().querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(el().textContent).not.toContain('Tu carrito esta vacio');
  });

  it('REQ-2.2: al terminar de cargar sin ítems muestra "Tu carrito esta vacio"', async () => {
    await create();

    resolveLoad();
    await settle();

    expect(el().textContent).toContain('Tu carrito esta vacio');
    expect(el().querySelectorAll('.skeleton').length).toBe(0);
  });

  it('REQ-2.2: al terminar de cargar con ítems los muestra', async () => {
    await create();
    items.set([item(1, 'Remera lisa')]);

    resolveLoad();
    await settle();

    expect(el().textContent).toContain('Remera lisa');
    expect(el().textContent).not.toContain('Tu carrito esta vacio');
  });

  it('REQ-2.2: si falla la carga muestra el error y "Reintentar" vuelve a pedir el carrito', async () => {
    await create();

    rejectLoad(new Error('boom'));
    await settle();
    expect(el().textContent).toContain('No pudimos cargar tu carrito');

    button('Reintentar')!.click();
    await settle();
    expect(loadCart).toHaveBeenCalledTimes(2);

    items.set([item(1, 'Remera lisa')]);
    resolveLoad();
    await settle();
    expect(el().textContent).toContain('Remera lisa');
    expect(el().textContent).not.toContain('No pudimos cargar tu carrito');
  });

  it('REQ-2.2: al quitar un ítem muestra el spinner y deshabilita el botón mientras espera, y el ítem desaparece al terminar', async () => {
    await create();
    items.set([item(1, 'Remera lisa'), item(2, 'Gorra')]);
    resolveLoad();
    await settle();

    button('Quitar')!.click();
    await settle();

    expect(remove).toHaveBeenCalledWith(1);
    expect(el().querySelector('button[disabled] .loading-spinner')).not.toBeNull();

    resolveRemove();
    await settle();

    expect(el().textContent).not.toContain('Remera lisa');
    expect(el().textContent).toContain('Gorra');
  });
});
