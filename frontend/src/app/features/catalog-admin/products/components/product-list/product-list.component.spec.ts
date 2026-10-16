import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
