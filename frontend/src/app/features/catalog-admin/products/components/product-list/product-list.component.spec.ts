import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AuthStore } from '../../../../../core/state/auth.store';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { ProductResModel } from '../../../../../core/data-access/products/prd-res.model';
import { ProductService } from '../../../../../core/data-access/products/product.service';
import { PrdListComponent } from './product-list.component';

const row = (id: number, status: ProductResModel['status']): ProductResModel => ({ id, name: `Producto ${id}`, description: '', price: 10, stock: 1, categories: [], status });

describe('PrdListComponent (insignias de estado)', () => {
  let fixture: ComponentFixture<PrdListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrdListComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductService, useValue: { getProductsByUserId: () => of([row(1, 'PUBLISHED'), row(2, 'DRAFT'), row(3, 'ARCHIVED')]) } },
        { provide: CategoryService, useValue: { getCategories: () => of([]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrdListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('en la tabla solo el producto PUBLISHED tiene la insignia de publicado (REQ-7.2)', () => {
    const badges = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('td span.badge'));
    const published = badges.filter((badge) => badge.classList.contains('badge-success'));

    expect(published.length).toBe(1);
    expect(published[0].textContent?.trim()).toBe('PUBLISHED');
  });

  it('en las tarjetas móviles también (REQ-7.2)', () => {
    const published = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-product-mobile-card span.badge-success'));

    expect(published.map((badge) => badge.textContent?.trim())).toEqual(['PUBLISHED']);
  });

  it('el formulario de alta ofrece como estado inicial un valor válido del backend (REQ-7.3)', () => {
    const status = fixture.componentInstance.productForm.controls.status.value;

    expect(['DRAFT', 'PUBLISHED', 'ARCHIVED']).toContain(status);
  });
});

describe('PrdListComponent (columna Categorías)', () => {
  const categoryCells = async (products: ProductResModel[]) => {
    await TestBed.configureTestingModule({
      imports: [PrdListComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductService, useValue: { getProductsByUserId: () => of(products) } },
        { provide: CategoryService, useValue: { getCategories: () => of([{ id: 1, name: 'Teclados' }, { id: 2, name: 'Mouse' }, { id: 3, name: 'Otra' }]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PrdListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('table tbody tr td:nth-child(3)')).map((td) => td.textContent?.trim());
  };

  it('REQ-3.1: muestra los nombres de las categorías del producto separados por coma', async () => {
    const cells = await categoryCells([{ ...row(1, 'PUBLISHED'), categories: [{ id: 1 }, { id: 2 }] }]);

    expect(cells).toEqual(['Teclados, Mouse']);
  });

  it('REQ-3.2: sin categorías muestra un guion', async () => {
    const cells = await categoryCells([row(1, 'PUBLISHED')]);

    expect(cells).toEqual(['-']);
  });
});

describe('PrdListComponent (estado asíncrono)', () => {
  let fixture: ComponentFixture<PrdListComponent>;
  let products: Subject<ProductResModel[]>;

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const tableNames = () => Array.from(el().querySelectorAll('table tbody tr td:nth-child(2)')).map((td) => td.textContent?.trim().split('\n')[0].trim());
  const nameHeader = () => Array.from(el().querySelectorAll('th')).find((th) => th.textContent?.includes('Nombre'))!;

  beforeEach(async () => {
    products = new Subject<ProductResModel[]>();
    await TestBed.configureTestingModule({
      imports: [PrdListComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductService, useValue: { getProductsByUserId: () => products } },
        { provide: CategoryService, useValue: { getCategories: () => of([]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrdListComponent);
    fixture.detectChanges();
    await settle();
  });

  it('REQ-2.2: antes de que lleguen los productos muestra "No hay productos para mostrar."', () => {
    expect(el().textContent).toContain('No hay productos para mostrar.');
  });

  it('REQ-2.2: cuando llegan los productos los muestra en las tarjetas y en la tabla', async () => {
    products.next([row(1, 'PUBLISHED'), row(2, 'DRAFT')]);
    await settle();

    expect(el().textContent).not.toContain('No hay productos para mostrar.');
    expect(el().querySelectorAll('app-product-mobile-card').length).toBe(2);
    expect(el().querySelectorAll('table tbody tr').length).toBe(2);
  });

  it('REQ-2.2: al escribir en el buscador filtra los productos por nombre', async () => {
    products.next([row(1, 'PUBLISHED'), row(2, 'DRAFT'), row(3, 'ARCHIVED')]);
    await settle();

    const input = el().querySelector<HTMLInputElement>('app-admin-toolbar input')!;
    input.value = 'Producto 2';
    input.dispatchEvent(new Event('input'));
    await settle();

    expect(el().querySelectorAll('app-product-mobile-card').length).toBe(1);
    expect(el().querySelectorAll('table tbody tr').length).toBe(1);
  });

  it('REQ-2.2: al hacer clic en el encabezado "Nombre" ordena y muestra la flecha, y otro clic invierte el orden', async () => {
    products.next([row(2, 'DRAFT'), row(3, 'ARCHIVED'), row(1, 'PUBLISHED')]);
    await settle();

    nameHeader().dispatchEvent(new Event('click'));
    await settle();
    expect(nameHeader().textContent).toContain('▲');
    expect(tableNames()).toEqual(['Producto 1', 'Producto 2', 'Producto 3']);

    nameHeader().dispatchEvent(new Event('click'));
    await settle();
    expect(nameHeader().textContent).toContain('▼');
    expect(tableNames()).toEqual(['Producto 3', 'Producto 2', 'Producto 1']);
  });
});
