import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';

import { CategoryResModel } from '../../../../../core/data-access/categories/category.model';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { GeneratedProductContent, ProductService } from '../../../../../core/data-access/products/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AuthStore } from '../../../../../core/state/auth.store';
import { PrdFormComponent } from './product-form.component';

const categories = [{ id: 1, name: 'Remeras' }, { id: 2, name: 'Gorras' }] as CategoryResModel[];

describe('PrdFormComponent (estado que cambia)', () => {
  let fixture: ComponentFixture<PrdFormComponent>;
  let form: FormGroup;
  let categoriesResponse: Subject<CategoryResModel[]>;
  let contentResponse: Subject<GeneratedProductContent>;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (label: string) => el().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  beforeEach(async () => {
    categoriesResponse = new Subject<CategoryResModel[]>();
    contentResponse = new Subject<GeneratedProductContent>();
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [PrdFormComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductService, useValue: { getDescriptionByAi: () => contentResponse } },
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => categoriesResponse } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: {} },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    const fb = TestBed.inject(FormBuilder);
    form = fb.group({
      name: fb.control('', Validators.required),
      description: fb.control(''),
      slug: fb.control(''),
      sku: fb.control(''),
      price: fb.control(0),
      stock: fb.control(0),
      categoryIds: fb.control<number[]>([]),
      thumbnailUrl: fb.control<string | null>(null),
      status: fb.control('DRAFT'),
    });
    fixture = TestBed.createComponent(PrdFormComponent);
    fixture.componentInstance.productForm = form;
    fixture.detectChanges();
    await settle();
  });

  it('REQ-2.2: mientras llegan las categorías muestra "Cargando categorías"', () => {
    expect(el().textContent).toContain('Cargando categorías');
  });

  it('REQ-2.2: cuando llegan las categorías las ofrece como opciones', async () => {
    categoriesResponse.next(categories);
    await settle();

    expect(el().textContent).not.toContain('Cargando categorías');
    expect(el().querySelectorAll('input[type="checkbox"]').length).toBe(2);
    expect(el().textContent).toContain('Remeras');
    expect(el().textContent).toContain('Gorras');
  });

  it('REQ-2.2: si las categorías se eligen por código (por ejemplo la IA), el nombre mostrado se actualiza', async () => {
    categoriesResponse.next(categories);
    await settle();
    expect(el().querySelector('[role="button"]')?.textContent).toContain('Ninguna');

    form.get('categoryIds')!.setValue([2]);
    fixture.detectChanges();

    expect(el().querySelector('[role="button"]')?.textContent).toContain('Gorras');
    expect(el().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1].checked).toBeTrue();
  });

  it('REQ-2.2: el botón de guardar se habilita cuando el formulario pasa a válido por código', async () => {
    expect(submitButton().disabled).toBeTrue();

    form.get('name')!.setValue('Teclado');
    fixture.detectChanges();

    expect(submitButton().disabled).toBeFalse();
  });

  it('REQ-2.2: generar descripción y slug muestra "Generando contenido..." mientras espera y completa los campos al terminar', async () => {
    form.get('name')!.setValue('Teclado');
    fixture.detectChanges();

    button('Generar descripción y slug con IA').click();
    await settle();
    expect(el().textContent).toContain('Generando contenido...');
    expect(button('Generar descripción y slug con IA').disabled).toBeTrue();

    contentResponse.next({ description: 'Switches rojos', slug: 'teclado' });
    await settle();

    expect(el().textContent).not.toContain('Generando contenido...');
    expect(form.get('description')!.value).toBe('Switches rojos');
    expect(form.get('slug')!.value).toBe('teclado');
    expect(notifications.success).toHaveBeenCalled();
  });

  it('REQ-2.2: si falla la generación vuelve el botón normal y avisa el error', async () => {
    form.get('name')!.setValue('Teclado');
    fixture.detectChanges();
    button('Generar descripción y slug con IA').click();
    await settle();

    contentResponse.error(new Error('boom'));
    await settle();

    expect(el().textContent).not.toContain('Generando contenido...');
    expect(el().textContent).toContain('Generar descripción y slug');
    expect(notifications.error).toHaveBeenCalled();
  });

  it('REQ-2.2: el botón de asistencia con IA abre y cierra la sección (aria-expanded)', async () => {
    const toggle = button('Mostrar u ocultar asistencia con IA');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await settle();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    await settle();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('REQ-2.2: con isSaving muestra "Guardando…" y deshabilita Cancelar y Guardar', async () => {
    form.get('name')!.setValue('Teclado');
    fixture.componentRef.setInput('isSaving', true);
    fixture.detectChanges();

    expect(el().textContent).toContain('Guardando…');
    expect(submitButton().disabled).toBeTrue();
    const cancel = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Cancelar')!;
    expect(cancel.disabled).toBeTrue();
  });
});
