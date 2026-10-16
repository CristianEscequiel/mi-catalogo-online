import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import { CartStore } from '../../core/state/cart.store';
import { FavoritesStore } from '../../core/state/favorites.store';
import { CategoryService } from '../../core/data-access/categories/category.service';
import { ProductResModel } from '../../core/data-access/products/prd-res.model';
import { ProductPage, ProductPageRequest, ProductService } from '../../core/data-access/products/product.service';
import { HomePage } from './home-page';

const product = (id: number): ProductResModel => ({
  id,
  name: `Producto ${id}`,
  slug: `producto-${id}`,
  description: `Descripcion ${id}`,
  price: 100,
  stock: 5,
  categories: [{ id: 1, name: 'Teclados' }],
  thumbnailUrl: null,
  status: 'PUBLISHED',
});

const pageOf = (ids: number[], info: { page: number; totalPages: number; total: number }): ProductPage => ({
  items: ids.map(product),
  limit: 12,
  ...info,
});

describe('HomePage (catálogo paginado)', () => {
  let fixture: ComponentFixture<HomePage>;
  let page: HomePage;
  // Una entrada por cada llamada a getProductsPage: lo pedido y un Subject para responder cuando el test quiera.
  let calls: Array<{ opts: ProductPageRequest; response: Subject<ProductPage> }>;

  const getProductsPage = (opts: ProductPageRequest): Observable<ProductPage> => {
    const response = new Subject<ProductPage>();
    calls.push({ opts, response });
    return response;
  };

  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const respond = async (index: number, body: ProductPage) => {
    calls[index].response.next(body);
    calls[index].response.complete();
    await settle();
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const shownNames = () => Array.from(el().querySelectorAll('article a.line-clamp-2')).map((a) => a.textContent?.trim());
  const loadMoreButton = () => el().querySelector<HTMLButtonElement>('button.load-more') ?? undefined;

  const create = async () => {
    fixture = TestBed.createComponent(HomePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    calls = [];
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ProductService, useValue: { getProductsPage } },
        { provide: CategoryService, useValue: { getCategories: () => of([{ id: 1, name: 'Teclados' }, { id: 2, name: 'Mouses' }]) } },
        { provide: AuthStore, useValue: { isLoggedIn: () => false } },
        { provide: CartStore, useValue: {} },
        { provide: FavoritesStore, useValue: { isFavorite: () => false, loadFavorites: () => Promise.resolve() } },
      ],
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('al abrir pide solo la primera página (REQ-6.1)', async () => {
    await create();

    expect(calls.length).toBe(1);
    expect(calls[0].opts).toEqual({ page: 1, limit: 12, search: '', categoryId: null });

    await respond(0, pageOf([1, 2], { page: 1, totalPages: 1, total: 2 }));
    expect(shownNames()).toEqual(['Producto 1', 'Producto 2']);
    expect(el().textContent).toContain('2 resultados');
  });

  it('muestra "Cargar más" si quedan páginas y lo oculta en la última (REQ-6.2, 6.4)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 2, total: 2 }));
    expect(loadMoreButton()?.textContent).toContain('Cargar mas');

    page.loadMore().catch(() => undefined);
    await settle();
    await respond(1, pageOf([2], { page: 2, totalPages: 2, total: 2 }));

    expect(loadMoreButton()).toBeUndefined();
  });

  it('no muestra el botón si hay una sola página (REQ-6.2)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 1, total: 1 }));

    expect(loadMoreButton()).toBeUndefined();
  });

  it('"Cargar más" pide la página siguiente, agrega sin repetir y se deshabilita mientras carga (REQ-6.3)', async () => {
    await create();
    await respond(0, pageOf([1, 2], { page: 1, totalPages: 2, total: 4 }));

    loadMoreButton()!.click();
    await settle();

    expect(calls[1].opts.page).toBe(2);
    expect(loadMoreButton()!.disabled).toBeTrue();

    // el producto 2 se repite porque se publicó otro entre medio
    await respond(1, pageOf([2, 3], { page: 2, totalPages: 2, total: 4 }));

    expect(shownNames()).toEqual(['Producto 1', 'Producto 2', 'Producto 3']);
  });

  it('un segundo clic mientras carga no dispara otra petición (REQ-6.3)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 3, total: 3 }));

    void page.loadMore();
    void page.loadMore();
    await settle();

    expect(calls.length).toBe(2);
  });

  it('la búsqueda espera 300 ms sin pulsar y pide la página 1 con search (REQ-6.5)', async () => {
    await create();
    await respond(0, pageOf([1, 2], { page: 1, totalPages: 1, total: 2 }));
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date());

    page.searchControl.setValue('tecl');
    jasmine.clock().tick(299);
    expect(calls.length).toBe(1);

    jasmine.clock().tick(1);
    expect(calls.length).toBe(2);
    expect(calls[1].opts).toEqual({ page: 1, limit: 12, search: 'tecl', categoryId: null });

    jasmine.clock().uninstall();
    await respond(1, pageOf([9], { page: 1, totalPages: 1, total: 1 }));
    expect(shownNames()).toEqual(['Producto 9']); // reemplaza, no agrega
  });

  it('seguir escribiendo reinicia la espera y solo se pide la última búsqueda (REQ-6.5)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 1, total: 1 }));
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date());

    page.searchControl.setValue('t');
    jasmine.clock().tick(200);
    page.searchControl.setValue('te');
    jasmine.clock().tick(200);
    expect(calls.length).toBe(1);

    jasmine.clock().tick(100);
    expect(calls.length).toBe(2);
    expect(calls[1].opts.search).toBe('te');
  });

  it('elegir y quitar una categoría pide la página 1 con y sin categoryId y reemplaza (REQ-6.6)', async () => {
    await create();
    await respond(0, pageOf([1, 2], { page: 1, totalPages: 1, total: 2 }));

    page.setCategory(2);
    await settle();
    expect(calls[1].opts).toEqual({ page: 1, limit: 12, search: '', categoryId: 2 });
    await respond(1, pageOf([7], { page: 1, totalPages: 1, total: 1 }));
    expect(shownNames()).toEqual(['Producto 7']);

    page.setCategory(null);
    await settle();
    expect(calls[2].opts).toEqual({ page: 1, limit: 12, search: '', categoryId: null });
    await respond(2, pageOf([1, 2], { page: 1, totalPages: 1, total: 2 }));
    expect(shownNames()).toEqual(['Producto 1', 'Producto 2']);
  });

  it('elegir la categoría que ya está activa no vuelve a pedir (REQ-6.6)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 1, total: 1 }));
    page.setCategory(2);
    await settle();
    await respond(1, pageOf([7], { page: 1, totalPages: 1, total: 1 }));

    page.setCategory(2);
    await settle();

    expect(calls.length).toBe(2);
  });

  it('una respuesta tardía de un filtro anterior se descarta (REQ-6.7)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 1, total: 1 }));

    page.setCategory(1); // petición A
    await settle();
    page.setCategory(2); // petición B, la vigente
    await settle();

    await respond(2, pageOf([22], { page: 1, totalPages: 1, total: 1 }));
    await respond(1, pageOf([11], { page: 1, totalPages: 1, total: 1 })); // llega tarde

    expect(shownNames()).toEqual(['Producto 22']);
    expect(page.total()).toBe(1);
  });

  it('una página extra pedida con un filtro anterior no se agrega al nuevo (REQ-6.7)', async () => {
    await create();
    await respond(0, pageOf([1], { page: 1, totalPages: 2, total: 2 }));

    void page.loadMore();
    await settle();
    page.setCategory(2);
    await settle();
    await respond(2, pageOf([22], { page: 1, totalPages: 1, total: 1 }));
    await respond(1, pageOf([99], { page: 2, totalPages: 2, total: 2 })); // la página 2 del filtro viejo

    expect(shownNames()).toEqual(['Producto 22']);
  });

  it('sin resultados muestra el estado vacío (REQ-6.8)', async () => {
    await create();
    await respond(0, pageOf([], { page: 1, totalPages: 0, total: 0 }));

    expect(el().textContent).toContain('No encontramos productos');
    expect(loadMoreButton()).toBeUndefined();
  });

  it('si falla la carga muestra el error con "Reintentar" que vuelve a pedir (REQ-6.9)', async () => {
    await create();
    calls[0].response.error(new Error('boom'));
    await settle();

    expect(el().textContent).toContain('No pudimos cargar la tienda');
    const retry = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Reintentar')!;
    retry.click();
    await settle();

    expect(calls.length).toBe(2);
    await respond(1, pageOf([1], { page: 1, totalPages: 1, total: 1 }));
    expect(shownNames()).toEqual(['Producto 1']);
  });

  it('si falla "Cargar más" conserva los productos y deja el botón en "Reintentar" (REQ-6.9)', async () => {
    await create();
    await respond(0, pageOf([1, 2], { page: 1, totalPages: 2, total: 4 }));

    loadMoreButton()!.click();
    await settle();
    calls[1].response.error(new Error('boom'));
    await settle();

    expect(shownNames()).toEqual(['Producto 1', 'Producto 2']);
    expect(el().textContent).not.toContain('No pudimos cargar la tienda');
    expect(loadMoreButton()?.textContent).toContain('Reintentar');

    loadMoreButton()!.click();
    await settle();
    expect(calls[2].opts.page).toBe(2);
    await respond(2, pageOf([3, 4], { page: 2, totalPages: 2, total: 4 }));
    expect(shownNames()).toEqual(['Producto 1', 'Producto 2', 'Producto 3', 'Producto 4']);
  });
});
