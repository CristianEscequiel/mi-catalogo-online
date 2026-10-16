import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { CategoryFormDialogComponent } from './category-form-dialog.component';

describe('CategoryFormDialogComponent (estado que cambia)', () => {
  let fixture: ComponentFixture<CategoryFormDialogComponent>;
  let component: CategoryFormDialogComponent;
  let deleteImage: Subject<{ id: number; imageUrl: string | null }>;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const configure = async (data: unknown) => {
    deleteImage = new Subject();
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    await TestBed.configureTestingModule({
      imports: [CategoryFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: Dialog, useValue: {} },
        { provide: CategoryService, useValue: { deleteCategoryImage: () => deleteImage } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  };

  it('REQ-2.2: en alta, subir una imagen antes de guardar la categoría muestra el mensaje de error en el campo de imagen', async () => {
    await configure({ mode: 'create' });

    await component.onUploadImage();
    await settle();

    expect(el().textContent).toContain('Primero guarda la categoría para subir su imagen.');
  });

  it('REQ-2.2: en alta, quitar la imagen elegida deja el campo sin imagen', async () => {
    await configure({ mode: 'create' });
    component.imageUrl.set('/uploads/categories/x.png');
    fixture.detectChanges();
    expect(el().querySelector('app-image-field img')).not.toBeNull();

    component.onDeleteImage();
    await settle();

    expect(el().querySelector('app-image-field img')).toBeNull();
  });

  it('REQ-2.2: en edición, al borrar la imagen muestra "Procesando..." mientras espera y quita la imagen al terminar', async () => {
    await configure({ mode: 'edit', id: 5, category: { id: 5, name: 'Remeras', description: '', imageUrl: '/uploads/categories/x.png' } });
    expect(el().querySelector('app-image-field img')).not.toBeNull();

    component.onDeleteImage();
    await settle();
    expect(el().textContent).toContain('Procesando...');

    deleteImage.next({ id: 5, imageUrl: null });
    await settle();

    expect(el().textContent).not.toContain('Procesando...');
    expect(el().querySelector('app-image-field img')).toBeNull();
    expect(notifications.success).toHaveBeenCalledWith('Imagen eliminada correctamente.');
  });
});
