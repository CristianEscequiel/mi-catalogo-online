import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProductModel } from './product.model';
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

  describe('llamadas HTTP del panel de administración y del detalle', () => {
    const url = (path: string) => http.expectOne((req) => req.url.endsWith(path));
    const body: ProductModel = {
      name: 'Remera',
      slug: 'remera',
      description: 'Algodón',
      price: 1000,
      stock: 5,
      categoryIds: [1],
      status: 'DRAFT',
    };

    it('REQ-5.4: getProductById hace GET /products/:id', () => {
      service.getProductById(4).subscribe();

      const req = url('/products/4');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('REQ-5.4: getProductBySlug hace GET /products/slug/:slug con el slug codificado', () => {
      service.getProductBySlug('remera azul').subscribe();

      const req = url('/products/slug/remera%20azul');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('REQ-5.4: postProduct hace POST /products con el cuerpo recibido y devuelve el producto creado', async () => {
      const result = service.postProduct(body);

      const req = url('/products');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: 9, ...body, categories: [] });

      expect((await result).id).toBe(9);
    });

    it('REQ-5.4: getProductsByUserId hace GET /users/:id/products', () => {
      service.getProductsByUserId(7).subscribe();

      const req = url('/users/7/products');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('REQ-5.4: getDescriptionByAi hace GET /products/generate-ai/:name', () => {
      service.getDescriptionByAi('remera').subscribe();

      const req = url('/products/generate-ai/remera');
      expect(req.request.method).toBe('GET');
      req.flush({ description: 'd', slug: 's' });
    });

    it('REQ-5.4: generateFromImage hace POST /products/generate-from-image con el cuerpo recibido', () => {
      const request = { imageUrl: 'https://img/x.png', categories: [] };
      service.generateFromImage(request).subscribe();

      const req = url('/products/generate-from-image');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({});
    });

    it('REQ-5.4: editProduct hace PUT /products/:id con el cuerpo recibido', () => {
      service.editProduct(4, body).subscribe();

      const req = url('/products/4');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({});
    });

    it('REQ-5.4: deleteProduct hace DELETE /products/:id', () => {
      service.deleteProduct(4).subscribe();

      const req = url('/products/4');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });

    it('REQ-5.4: uploadProductImage hace POST /products/:id/image con el archivo en el campo "file"', () => {
      const file = new File(['x'], 'foto.png', { type: 'image/png' });
      service.uploadProductImage(4, file).subscribe();

      const req = url('/products/4/image');
      expect(req.request.method).toBe('POST');
      expect((req.request.body as FormData).get('file')).toBe(file);
      req.flush({ id: 4, imageUrl: '/uploads/products/foto.png' });
    });

    it('REQ-5.4: deleteProductImage hace DELETE /products/:id/image', () => {
      service.deleteProductImage(4).subscribe();

      const req = url('/products/4/image');
      expect(req.request.method).toBe('DELETE');
      req.flush({ id: 4, imageUrl: null });
    });
  });
});
