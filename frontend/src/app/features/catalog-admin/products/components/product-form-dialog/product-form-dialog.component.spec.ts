import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { ProductResModel } from '../../../../../core/data-access/products/prd-res.model';
import { ProductService } from '../../../../../core/data-access/products/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AuthStore } from '../../../../../core/state/auth.store';
import { ProductFormDialogComponent } from './product-form-dialog.component';

describe('ProductFormDialogComponent (estado que cambia)', () => {
  let fixture: ComponentFixture<ProductFormDialogComponent>;
  let component: ProductFormDialogComponent;
  let resolvePost: (product: ProductResModel) => void;
  let rejectPost: (reason: unknown) => void;
  let close: jasmine.Spy;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const closeButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Cerrar modal de producto"]')!;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [ProductFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DIALOG_DATA, useValue: { mode: 'create' } },
        { provide: DialogRef, useValue: { close } },
        { provide: Dialog, useValue: {} },
        {
          provide: ProductService,
          useValue: {
            postProduct: () =>
              new Promise<ProductResModel>((resolve, reject) => {
                resolvePost = resolve;
                rejectPost = reject;
              }),
          },
        },
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => of([]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
    component.form.patchValue({ name: 'Teclado', price: 100, stock: 3 });
    fixture.detectChanges();
  });

  it('REQ-2.2: al guardar muestra "Guardando…" y deshabilita Guardar y Cerrar mientras espera', async () => {
    expect(submitButton().textContent).toContain('Crear producto');

    void component.onSubmit();
    await settle();

    expect(submitButton().textContent).toContain('Guardando…');
    expect(submitButton().disabled).toBeTrue();
    expect(closeButton().disabled).toBeTrue();
  });

  it('REQ-2.2: al crear con éxito avisa y cierra el diálogo con "updated"', async () => {
    void component.onSubmit();
    await settle();

    resolvePost({ id: 9 } as ProductResModel);
    await settle();

    expect(notifications.success).toHaveBeenCalledWith('Producto creado correctamente.');
    expect(close).toHaveBeenCalledWith('updated');
  });

  it('REQ-2.2: si falla el alta avisa el error y vuelve a habilitar el botón', async () => {
    void component.onSubmit();
    await settle();

    rejectPost(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo crear el producto.');
    expect(submitButton().textContent).toContain('Crear producto');
    expect(closeButton().disabled).toBeFalse();
    expect(close).not.toHaveBeenCalled();
  });

  it('REQ-2.2: si el alta da 403 avisa "Límite de demo alcanzado" y vuelve a habilitar el botón', async () => {
    void component.onSubmit();
    await settle();

    rejectPost(new HttpErrorResponse({ status: 403 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith('Límite de demo alcanzado');
    expect(closeButton().disabled).toBeFalse();
  });

  it('REQ-2.2: subir una imagen antes de guardar el producto muestra el mensaje de error en el campo de imagen', async () => {
    await component.onUploadImage();
    await settle();

    expect(el().textContent).toContain('Primero guarda el producto para subir su imagen.');
  });
});
