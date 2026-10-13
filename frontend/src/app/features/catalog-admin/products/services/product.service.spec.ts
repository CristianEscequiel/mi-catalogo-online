import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProductPage, ProductService } from './product.service';

describe('ProductService (catálogo paginado)', () => {
  let service: ProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const lastRequest = () => http.expectOne((req) => req.url.endsWith('/products'));

  it('pide solo page cuando no hay otros filtros', () => {
    service.getProductsPage({ page: 1 }).subscribe();

    const req = lastRequest();
    expect(req.request.params.keys()).toEqual(['page']);
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 });
  });

  it('envía limit, search y categoryId solo cuando están definidos', () => {
    service.getProductsPage({ page: 2, limit: 12, search: '  teclado ', categoryId: 3 }).subscribe();

    const req = lastRequest();
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('12');
    expect(req.request.params.get('search')).toBe('teclado');
    expect(req.request.params.get('categoryId')).toBe('3');
    req.flush({ items: [], total: 0, page: 2, limit: 12, totalPages: 0 });
  });

  it('omite search vacío y categoryId nulo', () => {
    service.getProductsPage({ page: 1, search: '   ', categoryId: null }).subscribe();

    const req = lastRequest();
    expect(req.request.params.has('search')).toBeFalse();
    expect(req.request.params.has('categoryId')).toBeFalse();
    req.flush({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 });
  });

  it('devuelve el objeto de página tal cual', () => {
    let page: ProductPage | undefined;
    service.getProductsPage({ page: 1 }).subscribe((res) => (page = res));

    const body: ProductPage = { items: [], total: 30, page: 1, limit: 12, totalPages: 3 };
    lastRequest().flush(body);

    expect(page).toEqual(body);
  });
});
