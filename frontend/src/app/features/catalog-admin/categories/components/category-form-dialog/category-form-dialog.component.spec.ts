import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
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

describe('CategoryFormDialogComponent (profile-and-images)', () => {
  type Created = { id: number; name: string };
  type ImageResponse = { id: number; imageUrl: string | null };

  let fixture: ComponentFixture<CategoryFormDialogComponent>;
  let component: CategoryFormDialogComponent;
  let createCategory: jasmine.Spy;
  let creations: Subject<Created>[];
  let uploadCategoryImage: jasmine.Spy;
  let uploads: Subject<ImageResponse>[];
  let editCategory: jasmine.Spy;
  let edits: Subject<Created>[];
  let dialogRef: { close: jasmine.Spy; disableClose: boolean };
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const FORMAT_MSG = 'Formato no permitido. Usa JPG, PNG o WebP.';
  const CREATED_MSG = 'Categoría creada, pero no se pudo subir la imagen. Puedes reintentarlo.';

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (text: string) => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
  const imageFile = () => new File(['x'], 'foto.png', { type: 'image/png' });
  const failure = (status: number) => new HttpErrorResponse({ status });

  const configure = async (data: unknown) => {
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    dialogRef = { close: jasmine.createSpy('close'), disableClose: false };
    creations = [];
    uploads = [];
    edits = [];
    createCategory = jasmine.createSpy('createCategory').and.callFake(() => {
      const subject = new Subject<Created>();
      creations.push(subject);
      return subject;
    });
    uploadCategoryImage = jasmine.createSpy('uploadCategoryImage').and.callFake(() => {
      const subject = new Subject<ImageResponse>();
      uploads.push(subject);
      return subject;
    });
    editCategory = jasmine.createSpy('editCategory').and.callFake(() => {
      const subject = new Subject<Created>();
      edits.push(subject);
      return subject;
    });

    await TestBed.configureTestingModule({
      imports: [CategoryFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: dialogRef },
        { provide: Dialog, useValue: {} },
        { provide: CategoryService, useValue: { createCategory, uploadCategoryImage, editCategory } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  };

  const configureCreate = async () => {
    await configure({ mode: 'create' });
    component.form.patchValue({ name: 'Ropa', description: 'Prendas' });
    fixture.detectChanges();
  };

  const configureEdit = async () => {
    await configure({ mode: 'edit', id: 5, category: { id: 5, name: 'Remeras', description: '', imageUrl: null } });
  };

  // Crea con un archivo elegido y hace fallar la subida: el diálogo queda en el estado de REQ-4.15.
  const createWithFailingUpload = async (error: unknown = failure(500)) => {
    await configureCreate();
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    creations[0].next({ id: 9, name: 'Ropa' });
    await settle();
    uploads[0].error(error);
    await settle();
  };

  it('M3 REQ-1.4: en reposo el diálogo se puede cerrar (disableClose en false)', async () => {
    await configureCreate();

    expect(dialogRef.disableClose).toBeFalse();
  });

  it('M3 REQ-1.4: mientras guarda no se puede cerrar con Escape ni con el fondo (disableClose en true)', async () => {
    await configureCreate();

    void component.onSubmit();
    await settle();

    expect(component.isSaving()).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
  });

  it('M3 REQ-1.4: mientras sube la imagen no se puede cerrar', async () => {
    await configureCreate();
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    creations[0].next({ id: 9, name: 'Ropa' });
    await settle();

    expect(component.isUploadingImage()).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
  });

  it('M3 REQ-1.4: si crear falla, el diálogo vuelve a poder cerrarse', async () => {
    await configureCreate();
    void component.onSubmit();
    await settle();
    creations[0].error(failure(500));
    await settle();

    expect(component.isSaving()).toBeFalse();
    expect(dialogRef.disableClose).toBeFalse();
  });

  it('M3 REQ-1.4: tras crear con fallo de imagen sigue sin poder cerrarse, también cuando termina un reintento', async () => {
    await createWithFailingUpload();
    expect(dialogRef.disableClose).toBeTrue();

    void component.onSubmit();
    await settle();
    expect(dialogRef.disableClose).toBeTrue();
    uploads[1].error(failure(500));
    await settle();

    expect(component.isUploadingImage()).toBeFalse();
    expect(component.created()).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
  });

  it('REQ-4.15: si la categoría se crea y la subida falla muestra un único aviso «Categoría creada, pero…»', async () => {
    await createWithFailingUpload();

    expect(notifications.error).toHaveBeenCalledTimes(1);
    expect(notifications.error).toHaveBeenCalledWith(CREATED_MSG);
  });

  it('REQ-4.15: tras el fallo de la imagen el diálogo sigue abierto y pasa a modo edición', async () => {
    await createWithFailingUpload();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Editar categoria');
  });

  it('REQ-4.15: tras el fallo de la imagen conserva los datos y no vuelve a subir automáticamente', async () => {
    await createWithFailingUpload();
    await settle();

    expect(component.form.value.name).toBe('Ropa');
    expect(component.form.value.description).toBe('Prendas');
    expect(uploadCategoryImage).toHaveBeenCalledTimes(1);
  });

  it('REQ-4.15: tras el fallo de la imagen conserva los datos (guardando con el botón real)', async () => {
    await configureCreate();
    component.onImageFileSelected(imageFile());
    button('Guardar')!.click();
    await settle();
    creations[0].next({ id: 9, name: 'Ropa' });
    await settle();
    uploads[0].error(failure(500));
    await settle();

    expect(component.form.value.name).toBe('Ropa');
  });

  it('REQ-4.15: tras el fallo muestra bajo el selector el mensaje genérico (error distinto de 413/415)', async () => {
    await createWithFailingUpload(failure(500));
    expect(el().querySelector('app-image-field')!.textContent).toContain('No se pudo subir la imagen.');
  });

  it('REQ-4.15: tras el fallo con 415 muestra bajo el selector el mensaje de formato', async () => {
    await createWithFailingUpload(failure(415));
    expect(el().querySelector('app-image-field')!.textContent).toContain(FORMAT_MSG);
  });

  it('REQ-4.15: tras el fallo con 413 muestra bajo el selector un mensaje que nombra los 5 MB', async () => {
    await createWithFailingUpload(failure(413));
    expect(el().querySelector('app-image-field [class*="text-error"]')?.textContent).toContain('5 MB');
  });

  it('REQ-4.16: «Guardar» tras el fallo edita la categoría existente y no crea otra', async () => {
    await createWithFailingUpload();

    void component.onSubmit();
    await settle();
    uploads[1].next({ id: 9, imageUrl: '/uploads/categories/x.png' });
    await settle();

    expect(createCategory).toHaveBeenCalledTimes(1);
    expect(editCategory).toHaveBeenCalledTimes(1);
    expect(editCategory.calls.mostRecent().args[0]).toBe(9);
  });

  it('REQ-4.16: «Guardar» tras el fallo con un archivo elegido reintenta la subida de ese archivo', async () => {
    await configureCreate();
    const file = imageFile();
    component.onImageFileSelected(file);
    void component.onSubmit();
    await settle();
    creations[0].next({ id: 9, name: 'Ropa' });
    await settle();
    uploads[0].error(failure(500));
    await settle();

    void component.onSubmit();
    await settle();

    expect(uploadCategoryImage).toHaveBeenCalledTimes(2);
    expect(uploadCategoryImage.calls.mostRecent().args).toEqual([9, file]);
  });

  it('REQ-4.16: «Guardar» tras el fallo sin archivo elegido hace solo el PUT, sin subida', async () => {
    await createWithFailingUpload();
    component.onImageFileSelected(null);

    void component.onSubmit();
    await settle();

    expect(uploadCategoryImage).toHaveBeenCalledTimes(1);
    expect(editCategory).toHaveBeenCalledTimes(1);
  });

  it('REQ-4.16: si el PUT y el reintento terminan bien avisa «Categoría actualizada correctamente.» y cierra con «updated»', async () => {
    await createWithFailingUpload();
    void component.onSubmit();
    await settle();
    uploads[1].next({ id: 9, imageUrl: '/uploads/categories/x.png' });
    await settle();

    edits[0].next({ id: 9, name: 'Ropa' });
    await settle();

    expect(notifications.success).toHaveBeenCalledWith('Categoría actualizada correctamente.');
    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.16: si el PUT del reintento falla avisa «No se pudo actualizar la categoría.» y deja el diálogo abierto con los botones habilitados', async () => {
    await createWithFailingUpload();
    component.onImageFileSelected(null);
    void component.onSubmit();
    await settle();

    edits[0].error(failure(500));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo actualizar la categoría.');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(button('Guardar')!.disabled).toBeFalse();
    expect(button('Cancelar')!.disabled).toBeFalse();
  });

  it('REQ-4.16: si la subida del reintento falla avisa el error de imagen y deja el diálogo abierto con los botones habilitados', async () => {
    await createWithFailingUpload();
    notifications.error.calls.reset();
    void component.onSubmit();
    await settle();

    uploads[1].error(failure(415));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith(FORMAT_MSG);
    expect(el().querySelector('app-image-field')!.textContent).toContain(FORMAT_MSG);
    expect(editCategory).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(button('Guardar')!.disabled).toBeFalse();
    expect(button('Cancelar')!.disabled).toBeFalse();
  });

  it('REQ-4.17: en edición, si la subida de la imagen falla la promesa de onSubmit no se rechaza', async () => {
    await configureEdit();
    component.onImageFileSelected(imageFile());

    const pending = component.onSubmit();
    await settle();
    uploads[0].error(failure(500));

    await expectAsync(pending).toBeResolved();
  });

  it('REQ-4.18: en edición, si la subida falla avisa en el aviso emergente y bajo el selector (415)', async () => {
    await configureEdit();
    component.onImageFileSelected(imageFile());
    void component.onSubmit().catch(() => undefined);
    await settle();

    uploads[0].error(failure(415));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith(FORMAT_MSG);
    expect(el().querySelector('app-image-field')!.textContent).toContain(FORMAT_MSG);
  });

  it('REQ-4.18: en edición, si la subida falla con otro error avisa «No se pudo subir la imagen.»', async () => {
    await configureEdit();
    component.onImageFileSelected(imageFile());
    void component.onSubmit().catch(() => undefined);
    await settle();

    uploads[0].error(failure(500));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo subir la imagen.');
    expect(el().querySelector('app-image-field')!.textContent).toContain('No se pudo subir la imagen.');
  });

  it('REQ-4.19: en edición, si la subida falla mantiene el diálogo abierto con los botones habilitados y sin PUT', async () => {
    await configureEdit();
    component.onImageFileSelected(imageFile());
    void component.onSubmit().catch(() => undefined);
    await settle();

    uploads[0].error(failure(500));
    await settle();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(editCategory).not.toHaveBeenCalled();
    expect(button('Guardar')!.disabled).toBeFalse();
    expect(button('Cancelar')!.disabled).toBeFalse();
  });

  it('REQ-4.20: si cierra el diálogo después de que la categoría se creó, lo cierra con «updated»', async () => {
    await createWithFailingUpload();

    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.20: el botón «Cancelar» del formulario también cierra con «updated» después de crear', async () => {
    await createWithFailingUpload();

    button('Cancelar')!.click();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.21: si la creación y la subida terminan bien muestra «Categoría creada correctamente.»', async () => {
    await configureCreate();
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    creations[0].next({ id: 9, name: 'Ropa' });
    await settle();

    uploads[0].next({ id: 9, imageUrl: '/uploads/categories/x.png' });
    await settle();

    expect(notifications.success).toHaveBeenCalledWith('Categoría creada correctamente.');
  });

  it('REQ-4.22: si la creación y la subida terminan bien cierra el diálogo con «updated»', async () => {
    await configureCreate();
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    creations[0].next({ id: 9, name: 'Ropa' });
    await settle();

    uploads[0].next({ id: 9, imageUrl: '/uploads/categories/x.png' });
    await settle();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.23: si la creación falla con 403 muestra «Límite de demo alcanzado»', async () => {
    await configureCreate();
    void component.onSubmit();
    await settle();

    creations[0].error(failure(403));
    await settle();

    expect(notifications.error).toHaveBeenCalledOnceWith('Límite de demo alcanzado');
  });

  it('REQ-4.24: si la creación falla con 403 deja el diálogo abierto en modo create con los datos conservados', async () => {
    await configureCreate();
    button('Guardar')!.click();
    await settle();

    creations[0].error(failure(403));
    await settle();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Crear nueva categoria');
    expect(component.form.value.name).toBe('Ropa');
  });

  it('REQ-4.25: si la creación falla con otro error muestra «No se pudo crear la categoría.»', async () => {
    await configureCreate();
    void component.onSubmit();
    await settle();

    creations[0].error(failure(500));
    await settle();

    expect(notifications.error).toHaveBeenCalledOnceWith('No se pudo crear la categoría.');
  });

  it('REQ-4.26: si la creación falla con otro error deja el diálogo abierto en modo create con los datos conservados', async () => {
    await configureCreate();
    button('Guardar')!.click();
    await settle();

    creations[0].error(failure(500));
    await settle();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Crear nueva categoria');
    expect(component.form.value.name).toBe('Ropa');
  });
});

describe('CategoryFormDialogComponent (profile-and-images, auditoría M1 y M2)', () => {
  type ImageResponse = { id: number; imageUrl: string | null };

  let fixture: ComponentFixture<CategoryFormDialogComponent>;
  let component: CategoryFormDialogComponent;
  let uploadCategoryImage: jasmine.Spy;
  let uploads: Subject<ImageResponse>[];
  let deleteCategoryImage: jasmine.Spy;
  let deletions: Subject<ImageResponse>[];
  let editCategory: jasmine.Spy;
  let dialogRef: { close: jasmine.Spy; disableClose: boolean };
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (text: string) => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text)!;
  const closeButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Cerrar modal de categoría"]')!;
  const imageFile = () => new File(['x'], 'foto.png', { type: 'image/png' });

  const configure = async (imageUrl: string | null) => {
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    dialogRef = { close: jasmine.createSpy('close'), disableClose: false };
    uploads = [];
    deletions = [];
    uploadCategoryImage = jasmine.createSpy('uploadCategoryImage').and.callFake(() => {
      const subject = new Subject<ImageResponse>();
      uploads.push(subject);
      return subject;
    });
    deleteCategoryImage = jasmine.createSpy('deleteCategoryImage').and.callFake(() => {
      const subject = new Subject<ImageResponse>();
      deletions.push(subject);
      return subject;
    });
    editCategory = jasmine.createSpy('editCategory').and.callFake(() => new Subject<{ id: number; name: string }>());

    await TestBed.configureTestingModule({
      imports: [CategoryFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DIALOG_DATA, useValue: { mode: 'edit', id: 5, category: { id: 5, name: 'Remeras', description: '', imageUrl } } },
        { provide: DialogRef, useValue: dialogRef },
        { provide: Dialog, useValue: {} },
        { provide: CategoryService, useValue: { uploadCategoryImage, deleteCategoryImage, editCategory } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  };

  // Deja una subida en curso (edición, sin imagen guardada, con archivo elegido).
  const startUpload = async () => {
    await configure(null);
    component.onImageFileSelected(imageFile());
    void component.onUploadImage().catch(() => undefined);
    await settle();
  };

  it('REQ-4.27: con una subida de imagen en curso «Guardar» está deshabilitado', async () => {
    await configure(null);
    expect(button('Guardar').disabled).toBeFalse();

    component.onImageFileSelected(imageFile());
    void component.onUploadImage().catch(() => undefined);
    await settle();

    expect(component.isUploadingImage()).toBeTrue();
    expect(button('Guardar').disabled).toBeTrue();
  });

  it('REQ-4.28: con una subida en curso «Cancelar» y la «X» del encabezado están deshabilitados', async () => {
    await startUpload();

    expect(button('Cancelar').disabled).toBeTrue();
    expect(closeButton().disabled).toBeTrue();
  });

  it('REQ-4.28: con una subida en curso onCancel() no cierra el diálogo', async () => {
    await startUpload();

    component.onCancel();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('REQ-4.28: al terminar la subida «Guardar», «Cancelar» y la «X» vuelven a habilitarse', async () => {
    await startUpload();

    uploads[0].next({ id: 5, imageUrl: '/uploads/categories/x.png' });
    await settle();

    expect(button('Guardar').disabled).toBeFalse();
    expect(button('Cancelar').disabled).toBeFalse();
    expect(closeButton().disabled).toBeFalse();
  });

  it('REQ-4.29: onSubmit() con una subida en curso no hace una segunda subida ni el PUT', async () => {
    await startUpload();
    expect(uploadCategoryImage).toHaveBeenCalledTimes(1);

    await component.onSubmit();
    await settle();

    expect(uploadCategoryImage).toHaveBeenCalledTimes(1);
    expect(editCategory).not.toHaveBeenCalled();
    expect(component.isSaving()).toBeFalse();
  });

  it('REQ-4.30: si la subida automática falla en modo edición onUploadImage() no rechaza y avisa el error', async () => {
    await configure(null);
    component.onImageFileSelected(imageFile());

    const pending = component.onUploadImage();
    await settle();
    uploads[0].error(new HttpErrorResponse({ status: 415 }));
    await settle();

    await expectAsync(pending).toBeResolved();
    expect(notifications.error).toHaveBeenCalledWith('Formato no permitido. Usa JPG, PNG o WebP.');
  });

  it('REQ-4.31: si el borrado de la imagen falla en modo edición avisa «No se pudo eliminar la imagen.» sin rechazo sin manejar', async () => {
    await configure('/uploads/categories/x.png');

    // Un rechazo sin manejar frena toda la corrida de Karma: se intercepta en captura para que el test falle por aserción.
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('unhandledrejection', onUnhandled, true);
    try {
      const result = component.onDeleteImage() as unknown;
      await settle();
      deletions[0].error(new HttpErrorResponse({ status: 500 }));
      await settle();
      await expectAsync(Promise.resolve(result)).toBeResolved();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandled, true);
    }

    expect(unhandled).toEqual([]);
    expect(notifications.error).toHaveBeenCalledOnceWith('No se pudo eliminar la imagen.');
  });
});
