import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { ProductResModel } from '../../core/data-access/products/prd-res.model';
import { ProductService } from '../../core/data-access/products/product.service';
import { AuthStore } from '../../core/state/auth.store';
import { CartStore } from '../../core/state/cart.store';
import { FavoritesStore } from '../../core/state/favorites.store';
import { ProductDetailPage } from './product-detail-page';

const product: ProductResModel = {
  id: 4,
  name: 'Teclado mecánico',
  slug: 'teclado-mecanico',
  description: 'Switches rojos',
  price: 1000,
  stock: 5,
  categories: [{ id: 1, name: 'Teclados' }],
  thumbnailUrl: null,
  status: 'PUBLISHED',
};

describe('ProductDetailPage (estados)', () => {
  let fixture: ComponentFixture<ProductDetailPage>;
  let response: Subject<ProductResModel>;

  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const el = () => fixture.nativeElement as HTMLElement;

  const create = async () => {
    fixture = TestBed.createComponent(ProductDetailPage);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    response = new Subject<ProductResModel>();
    spyOn(console, 'error');
    TestBed.configureTestingModule({
      imports: [ProductDetailPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'teclado-mecanico' })) } },
        { provide: ProductService, useValue: { getProductBySlug: () => response } },
        { provide: AuthStore, useValue: { isLoggedIn: () => false } },
        { provide: CartStore, useValue: {} },
        { provide: FavoritesStore, useValue: { isFavorite: () => false, loadFavorites: () => Promise.resolve() } },
      ],
    });
  });

  it('REQ-5.5: mientras carga muestra el esqueleto y no el producto', async () => {
    await create();

    expect(el().querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(el().textContent).not.toContain('Teclado mecánico');
  });

  it('REQ-5.5: con el producto cargado lo muestra y quita el esqueleto', async () => {
    await create();

    response.next(product);
    response.complete();
    await settle();

    expect(el().textContent).toContain('Teclado mecánico');
    expect(el().querySelectorAll('.skeleton').length).toBe(0);
  });

  it('REQ-5.5: si el producto no existe (404) muestra "Producto no encontrado" con el enlace al catálogo', async () => {
    await create();

    response.error(new HttpErrorResponse({ status: 404 }));
    await settle();

    expect(el().textContent).toContain('Producto no encontrado');
    const backLink = Array.from(el().querySelectorAll('a')).find((a) => a.textContent?.includes('Volver al catálogo'));
    expect(backLink?.getAttribute('href')).toBe('/home');
  });

  it('REQ-5.5: si falla la carga (500) muestra el mensaje de error', async () => {
    await create();

    response.error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(el().textContent).toContain('No se pudo cargar el producto');
    expect(el().textContent).not.toContain('Producto no encontrado');
  });
});
