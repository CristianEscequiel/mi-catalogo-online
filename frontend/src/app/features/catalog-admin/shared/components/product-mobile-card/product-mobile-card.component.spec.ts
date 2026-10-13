import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductResModel } from '../../../products/models/prd-res.model';
import { ProductMobileCardComponent } from './product-mobile-card.component';

const productWith = (status: ProductResModel['status']): ProductResModel => ({
  id: 1,
  name: 'Teclado',
  description: 'Mecánico',
  price: 100,
  stock: 3,
  categories: [],
  status,
});

describe('ProductMobileCardComponent (insignia de estado)', () => {
  let fixture: ComponentFixture<ProductMobileCardComponent>;

  const statusBadge = (status: ProductResModel['status']) => {
    fixture = TestBed.createComponent(ProductMobileCardComponent);
    fixture.componentInstance.product = productWith(status);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('span.badge')).find((badge) => badge.textContent?.trim() === status);
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [ProductMobileCardComponent], providers: [provideZonelessChangeDetection()] }));

  it('un producto PUBLISHED se muestra con la insignia de publicado (REQ-7.2)', () => {
    expect(statusBadge('PUBLISHED')?.classList).toContain('badge-success');
  });

  it('DRAFT y ARCHIVED mantienen sus insignias (REQ-7.2)', () => {
    expect(statusBadge('DRAFT')?.classList).toContain('badge-ghost');
    expect(statusBadge('DRAFT')?.classList).not.toContain('badge-success');
    expect(statusBadge('ARCHIVED')?.classList).toContain('badge-neutral');
    expect(statusBadge('ARCHIVED')?.classList).not.toContain('badge-success');
  });
});
