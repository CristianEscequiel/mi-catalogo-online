import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { CategoryResModel } from '../../../../../core/data-access/categories/category.model';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { AuthStore } from '../../../../../core/state/auth.store';
import { CategoryListComponent } from './category-list.component';

const category = (id: number, name: string, description = ''): CategoryResModel => ({ id, name, description });

describe('CategoryListComponent (estado asíncrono)', () => {
  let fixture: ComponentFixture<CategoryListComponent>;
  let categories: Subject<CategoryResModel[]>;

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    categories = new Subject<CategoryResModel[]>();
    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => categories } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    await settle();
  });

  it('REQ-2.2: antes de que lleguen las categorías muestra "No hay categorías para mostrar."', () => {
    expect(el().textContent).toContain('No hay categorías para mostrar.');
  });

  it('REQ-2.2: cuando llegan las categorías las muestra en las tarjetas y en la tabla', async () => {
    categories.next([category(1, 'Remeras'), category(2, 'Gorras')]);
    await settle();

    expect(el().textContent).not.toContain('No hay categorías para mostrar.');
    expect(el().querySelectorAll('app-category-mobile-card').length).toBe(2);
    expect(el().querySelectorAll('table tbody tr').length).toBe(2);
  });

  it('REQ-2.2: al escribir en el buscador filtra las categorías por nombre', async () => {
    categories.next([category(1, 'Remeras'), category(2, 'Gorras'), category(3, 'Pantalones')]);
    await settle();

    const input = el().querySelector<HTMLInputElement>('app-admin-toolbar input')!;
    input.value = 'gor';
    input.dispatchEvent(new Event('input'));
    await settle();

    expect(el().querySelectorAll('app-category-mobile-card').length).toBe(1);
    expect(el().querySelector('app-category-mobile-card')?.textContent).toContain('Gorras');
    expect(el().querySelectorAll('table tbody tr').length).toBe(1);
  });
});
