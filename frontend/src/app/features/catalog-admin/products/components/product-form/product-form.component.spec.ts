import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AuthStore } from '../../../../../core/state/auth.store';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { ProductService } from '../../../../../core/data-access/products/product.service';
import { PrdFormComponent } from './product-form.component';

const BACKEND_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

describe('PrdFormComponent (estado del producto)', () => {
  let fixture: ComponentFixture<PrdFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrdFormComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductService, useValue: {} },
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => of([]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compileComponents();

    const fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(PrdFormComponent);
    fixture.componentInstance.productForm = fb.group({
      name: fb.control('Teclado'),
      description: fb.control(''),
      slug: fb.control(''),
      sku: fb.control(''),
      price: fb.control(0),
      stock: fb.control(0),
      categoryIds: fb.control<number[]>([]),
      thumbnailUrl: fb.control<string | null>(null),
      status: fb.control('DRAFT'),
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('el selector de estado solo ofrece valores que acepta el backend (REQ-7.3)', () => {
    const options = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('#status option')).map((option) => option.value);

    expect(options.length).toBe(3);
    for (const value of options) {
      expect(BACKEND_STATUSES).toContain(value);
    }
  });

  it('elegir "PUBLISHED" deja ese valor en el formulario que se envía (REQ-7.3)', () => {
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#status')!;

    select.value = 'PUBLISHED';
    select.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.productForm.value.status).toBe('PUBLISHED');
  });
});
