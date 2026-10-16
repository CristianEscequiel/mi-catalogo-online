import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryResModel } from '../../../../../core/data-access/categories/category.model';
import { CategoryMobileCardComponent } from './category-mobile-card.component';

describe('CategoryMobileCardComponent', () => {
  let fixture: ComponentFixture<CategoryMobileCardComponent>;

  const el = () => fixture.nativeElement as HTMLElement;
  const setCategory = (category: CategoryResModel) => {
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CategoryMobileCardComponent], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(CategoryMobileCardComponent);
  });

  it('REQ-2.2: muestra nombre, slug calculado, cantidad de productos y descripción de la categoría recibida', () => {
    setCategory({ id: 1, name: 'Remeras Lisas', description: 'Algodón', products: [{ id: 1 }, { id: 2 }] });

    expect(el().textContent).toContain('Remeras Lisas');
    expect(el().textContent).toContain('/remeras-lisas');
    expect(el().textContent).toContain('Productos: 2');
    expect(el().textContent).toContain('Algodón');
  });

  it('REQ-2.2: si cambia la categoría recibida, actualiza lo que muestra', () => {
    setCategory({ id: 1, name: 'Remeras', description: '' });
    expect(el().textContent).toContain('Sin descripción');

    setCategory({ id: 2, name: 'Gorras', slug: 'gorras-2026', description: 'De verano', productsCount: 7 });

    expect(el().textContent).toContain('Gorras');
    expect(el().textContent).toContain('/gorras-2026');
    expect(el().textContent).toContain('Productos: 7');
    expect(el().textContent).not.toContain('Sin descripción');
  });

  it('REQ-2.2: "Editar" y "Eliminar" emiten la categoría', () => {
    const category: CategoryResModel = { id: 1, name: 'Remeras', description: '' };
    setCategory(category);
    const edited: CategoryResModel[] = [];
    const removed: CategoryResModel[] = [];
    fixture.componentInstance.edit.subscribe((c) => edited.push(c));
    fixture.componentInstance.remove.subscribe((c) => removed.push(c));
    const buttons = Array.from(el().querySelectorAll<HTMLButtonElement>('button'));

    buttons.find((b) => b.textContent?.trim() === 'Editar')!.click();
    buttons.find((b) => b.textContent?.trim() === 'Eliminar')!.click();

    expect(edited).toEqual([category]);
    expect(removed).toEqual([category]);
  });
});
