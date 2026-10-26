import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { ProductResModel } from '../../../../../core/data-access/products/prd-res.model';
import { GenerateProductFromImageResponse, ProductService } from '../../../../../core/data-access/products/product.service';
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

describe('ProductFormDialogComponent (profile-and-images)', () => {
  let fixture: ComponentFixture<ProductFormDialogComponent>;
  let component: ProductFormDialogComponent;
  let postProduct: jasmine.Spy;
  let resolvePost: (product: ProductResModel) => void;
  let rejectPost: (reason: unknown) => void;
  let uploadProductImage: jasmine.Spy;
  let uploads: Subject<{ id: number; imageUrl: string | null }>[];
  let editProduct: jasmine.Spy;
  let edits: Subject<ProductResModel>[];
  let dialogRef: { close: jasmine.Spy; disableClose: boolean };
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };

  const FORMAT_MSG = 'Formato no permitido. Usa JPG, PNG o WebP.';
  const CREATED_MSG = 'Producto creado, pero no se pudo subir la imagen. Puedes reintentarlo.';

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
  const cancelButton = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Cancelar')!;
  const imageFile = () => new File(['x'], 'foto.png', { type: 'image/png' });

  beforeEach(async () => {
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    dialogRef = { close: jasmine.createSpy('close'), disableClose: false };
    uploads = [];
    edits = [];
    postProduct = jasmine.createSpy('postProduct').and.callFake(
      () =>
        new Promise<ProductResModel>((resolve, reject) => {
          resolvePost = resolve;
          rejectPost = reject;
        }),
    );
    uploadProductImage = jasmine.createSpy('uploadProductImage').and.callFake(() => {
      const subject = new Subject<{ id: number; imageUrl: string | null }>();
      uploads.push(subject);
      return subject;
    });
    editProduct = jasmine.createSpy('editProduct').and.callFake(() => {
      const subject = new Subject<ProductResModel>();
      edits.push(subject);
      return subject;
    });
    spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [ProductFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DIALOG_DATA, useValue: { mode: 'create' } },
        { provide: DialogRef, useValue: dialogRef },
        { provide: Dialog, useValue: {} },
        { provide: ProductService, useValue: { postProduct, uploadProductImage, editProduct } },
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

  // Crea con un archivo elegido y hace fallar la subida con el error dado; el diálogo queda en el estado de REQ-4.3.
  const createWithFailingUpload = async (error: unknown = new HttpErrorResponse({ status: 500 })) => {
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    resolvePost({ id: 9 } as ProductResModel);
    await settle();
    uploads[0].error(error);
    await settle();
  };

  it('M3 REQ-1.2: en reposo el diálogo se puede cerrar (disableClose en false)', async () => {
    await settle();

    expect(dialogRef.disableClose).toBeFalse();
  });

  it('M3 REQ-1.1: mientras guarda no se puede cerrar con Escape ni con el fondo (disableClose en true)', async () => {
    void component.onSubmit();
    await settle();

    expect(component.isSaving()).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
  });

  it('M3 REQ-1.1: mientras sube la imagen no se puede cerrar', async () => {
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    resolvePost({ id: 9 } as ProductResModel);
    await settle();

    expect(component.isUploadingImage()).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
  });

  it('M3 REQ-1.2: si crear falla, el diálogo vuelve a poder cerrarse', async () => {
    void component.onSubmit();
    await settle();
    rejectPost(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(component.isSaving()).toBeFalse();
    expect(dialogRef.disableClose).toBeFalse();
  });

  it('M3 REQ-1.3: tras crear con fallo de imagen sigue sin poder cerrarse, también cuando termina un reintento', async () => {
    await createWithFailingUpload();
    expect(dialogRef.disableClose).toBeTrue();

    void component.onSubmit();
    await settle();
    expect(dialogRef.disableClose).toBeTrue();
    uploads[1].error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(component.isUploadingImage()).toBeFalse();
    expect(component.created()).toBeTrue();
    expect(dialogRef.disableClose).toBeTrue();
  });

  it('REQ-4.1: si el producto se crea y la subida falla muestra un único aviso «Producto creado, pero…»', async () => {
    await createWithFailingUpload();

    expect(notifications.error).toHaveBeenCalledTimes(1);
    expect(notifications.error).toHaveBeenCalledWith(CREATED_MSG);
  });

  it('REQ-4.2: tras el fallo de la imagen el diálogo sigue abierto', async () => {
    await createWithFailingUpload();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('REQ-4.3: tras el fallo de la imagen el diálogo pasa a modo edición del producto creado', async () => {
    await createWithFailingUpload();

    expect(el().textContent).toContain('Editar producto');
    expect(submitButton().textContent).toContain('Guardar producto');
  });

  it('REQ-4.4: tras el fallo de la imagen conserva los datos del formulario (guardando con el botón real)', async () => {
    component.onImageFileSelected(imageFile());
    submitButton().click();
    await settle();
    resolvePost({ id: 9 } as ProductResModel);
    await settle();
    uploads[0].error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(component.form.value.name).toBe('Teclado');
    expect(component.form.value.price).toBe(100);
    expect(component.form.value.stock).toBe(3);
  });

  it('REQ-4.5: tras el fallo no vuelve a subir el archivo automáticamente al cambiar de modo', async () => {
    await createWithFailingUpload();
    await settle();

    expect(uploadProductImage).toHaveBeenCalledTimes(1);
  });

  it('REQ-4.6: tras el fallo muestra bajo el selector el mensaje genérico de imagen (error distinto de 413/415)', async () => {
    await createWithFailingUpload(new HttpErrorResponse({ status: 500 }));

    expect(el().querySelector('app-image-field')!.textContent).toContain('No se pudo subir la imagen.');
  });

  it('REQ-4.6: tras el fallo con 415 muestra bajo el selector el mensaje de formato', async () => {
    await createWithFailingUpload(new HttpErrorResponse({ status: 415 }));

    expect(el().querySelector('app-image-field')!.textContent).toContain(FORMAT_MSG);
  });

  it('REQ-4.6: tras el fallo con 413 muestra bajo el selector un mensaje que nombra los 5 MB', async () => {
    await createWithFailingUpload(new HttpErrorResponse({ status: 413 }));

    expect(el().querySelector('app-image-field [class*="text-error"]')?.textContent).toContain('5 MB');
  });

  it('REQ-4.7: «Guardar» tras el fallo edita el producto existente (PUT) y no crea otro', async () => {
    await createWithFailingUpload();

    void component.onSubmit();
    await settle();

    expect(postProduct).toHaveBeenCalledTimes(1);
    uploads[1].next({ id: 9, imageUrl: '/uploads/products/x.png' });
    await settle();
    expect(editProduct).toHaveBeenCalledTimes(1);
    expect(editProduct.calls.mostRecent().args[0]).toBe(9);
  });

  it('REQ-4.8: «Guardar» tras el fallo con un archivo elegido reintenta la subida de ese archivo', async () => {
    const file = imageFile();
    component.onImageFileSelected(file);
    void component.onSubmit();
    await settle();
    resolvePost({ id: 9 } as ProductResModel);
    await settle();
    uploads[0].error(new HttpErrorResponse({ status: 500 }));
    await settle();

    void component.onSubmit();
    await settle();

    expect(uploadProductImage).toHaveBeenCalledTimes(2);
    expect(uploadProductImage.calls.mostRecent().args).toEqual([9, file]);
  });

  it('REQ-4.9: «Guardar» tras el fallo sin archivo elegido hace solo el PUT, sin subida', async () => {
    await createWithFailingUpload();
    component.onImageFileSelected(null);

    void component.onSubmit();
    await settle();

    expect(uploadProductImage).toHaveBeenCalledTimes(1);
    expect(editProduct).toHaveBeenCalledTimes(1);
  });

  it('REQ-4.10: si el PUT y el reintento terminan bien muestra «Producto actualizado correctamente.»', async () => {
    await createWithFailingUpload();
    void component.onSubmit();
    await settle();
    uploads[1].next({ id: 9, imageUrl: '/uploads/products/x.png' });
    await settle();

    edits[0].next({ id: 9 } as ProductResModel);
    await settle();

    expect(notifications.success).toHaveBeenCalledWith('Producto actualizado correctamente.');
  });

  it('REQ-4.11: si el PUT y el reintento terminan bien cierra el diálogo con «updated»', async () => {
    await createWithFailingUpload();
    void component.onSubmit();
    await settle();
    uploads[1].next({ id: 9, imageUrl: '/uploads/products/x.png' });
    await settle();

    edits[0].next({ id: 9 } as ProductResModel);
    await settle();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.12: si el PUT del reintento falla avisa «No se pudo actualizar el producto.» y deja el diálogo abierto con los botones habilitados', async () => {
    await createWithFailingUpload();
    component.onImageFileSelected(null);
    void component.onSubmit();
    await settle();

    edits[0].error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo actualizar el producto.');
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(submitButton().disabled).toBeFalse();
    expect(cancelButton().disabled).toBeFalse();
    expect(closeButton().disabled).toBeFalse();
  });

  it('REQ-4.13: si la subida del reintento falla con 415 avisa el formato en el aviso emergente y bajo el selector', async () => {
    await createWithFailingUpload();
    notifications.error.calls.reset();
    void component.onSubmit();
    await settle();

    uploads[1].error(new HttpErrorResponse({ status: 415 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith(FORMAT_MSG);
    expect(el().querySelector('app-image-field')!.textContent).toContain(FORMAT_MSG);
  });

  it('REQ-4.13: si la subida del reintento falla con 413 el aviso emergente y el mensaje bajo el selector nombran los 5 MB', async () => {
    await createWithFailingUpload();
    notifications.error.calls.reset();
    void component.onSubmit();
    await settle();

    uploads[1].error(new HttpErrorResponse({ status: 413 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledTimes(1);
    expect(notifications.error.calls.mostRecent().args[0]).toContain('5 MB');
    expect(el().querySelector('app-image-field [class*="text-error"]')?.textContent).toContain('5 MB');
  });

  it('REQ-4.13: si la subida del reintento falla con otro error avisa «No se pudo subir la imagen.» en ambos lugares', async () => {
    await createWithFailingUpload();
    notifications.error.calls.reset();
    void component.onSubmit();
    await settle();

    uploads[1].error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo subir la imagen.');
    expect(el().querySelector('app-image-field')!.textContent).toContain('No se pudo subir la imagen.');
  });

  it('REQ-4.14: si la subida del reintento falla mantiene el diálogo abierto en modo edición con los botones habilitados', async () => {
    await createWithFailingUpload();
    void component.onSubmit();
    await settle();

    uploads[1].error(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(editProduct).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Editar producto');
    expect(submitButton().disabled).toBeFalse();
    expect(closeButton().disabled).toBeFalse();
  });

  it('REQ-4.20: si cierra el diálogo después de que el producto se creó, lo cierra con «updated»', async () => {
    await createWithFailingUpload();

    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.20: el botón «Cancelar» del formulario también cierra con «updated» después de crear', async () => {
    await createWithFailingUpload();

    cancelButton().click();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.21: si la creación y la subida terminan bien muestra «Producto creado correctamente.»', async () => {
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    resolvePost({ id: 9 } as ProductResModel);
    await settle();

    uploads[0].next({ id: 9, imageUrl: '/uploads/products/x.png' });
    await settle();

    expect(notifications.success).toHaveBeenCalledWith('Producto creado correctamente.');
  });

  it('REQ-4.22: si la creación y la subida terminan bien cierra el diálogo con «updated»', async () => {
    component.onImageFileSelected(imageFile());
    void component.onSubmit();
    await settle();
    resolvePost({ id: 9 } as ProductResModel);
    await settle();

    uploads[0].next({ id: 9, imageUrl: '/uploads/products/x.png' });
    await settle();

    expect(dialogRef.close).toHaveBeenCalledOnceWith('updated');
  });

  it('REQ-4.23: si la creación falla con 403 muestra «Límite de demo alcanzado» y no avisa otro error', async () => {
    void component.onSubmit();
    await settle();

    rejectPost(new HttpErrorResponse({ status: 403 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledOnceWith('Límite de demo alcanzado');
  });

  it('REQ-4.24: si la creación falla con 403 deja el diálogo abierto en modo create', async () => {
    void component.onSubmit();
    await settle();

    rejectPost(new HttpErrorResponse({ status: 403 }));
    await settle();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Nuevo producto');
    expect(submitButton().textContent).toContain('Crear producto');
  });

  it('REQ-4.25: si la creación falla con otro error muestra «No se pudo crear el producto.»', async () => {
    void component.onSubmit();
    await settle();

    rejectPost(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(notifications.error).toHaveBeenCalledOnceWith('No se pudo crear el producto.');
  });

  it('REQ-4.26: si la creación falla con otro error deja el diálogo abierto en modo create con los datos conservados', async () => {
    submitButton().click();
    await settle();

    rejectPost(new HttpErrorResponse({ status: 500 }));
    await settle();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(el().textContent).toContain('Nuevo producto');
    expect(component.form.value.name).toBe('Teclado');
  });
});

describe('ProductFormDialogComponent (profile-and-images, auditoría M1 y M2)', () => {
  let fixture: ComponentFixture<ProductFormDialogComponent>;
  let component: ProductFormDialogComponent;
  let uploadProductImage: jasmine.Spy;
  let uploads: Subject<{ id: number; imageUrl: string | null }>[];
  let deleteProductImage: jasmine.Spy;
  let deletions: Subject<{ id: number; imageUrl: string | null }>[];
  let editProduct: jasmine.Spy;
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
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const closeButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Cerrar modal de producto"]')!;
  const cancelButton = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Cancelar')!;
  const imageFile = () => new File(['x'], 'foto.png', { type: 'image/png' });

  const configure = async (thumbnailUrl: string | null) => {
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    dialogRef = { close: jasmine.createSpy('close'), disableClose: false };
    uploads = [];
    deletions = [];
    uploadProductImage = jasmine.createSpy('uploadProductImage').and.callFake(() => {
      const subject = new Subject<{ id: number; imageUrl: string | null }>();
      uploads.push(subject);
      return subject;
    });
    deleteProductImage = jasmine.createSpy('deleteProductImage').and.callFake(() => {
      const subject = new Subject<{ id: number; imageUrl: string | null }>();
      deletions.push(subject);
      return subject;
    });
    editProduct = jasmine.createSpy('editProduct').and.callFake(() => new Subject<ProductResModel>());
    spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [ProductFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: DIALOG_DATA,
          useValue: { mode: 'edit', id: 5, product: { id: 5, name: 'Teclado', price: 100, stock: 3, status: 'DRAFT', categoryIds: [], thumbnailUrl } },
        },
        { provide: DialogRef, useValue: dialogRef },
        { provide: Dialog, useValue: {} },
        { provide: ProductService, useValue: { uploadProductImage, deleteProductImage, editProduct } },
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => of([]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormDialogComponent);
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

  it('REQ-4.27: con una subida de imagen en curso «Guardar producto» está deshabilitado', async () => {
    await configure(null);
    expect(submitButton().disabled).toBeFalse();

    component.onImageFileSelected(imageFile());
    void component.onUploadImage().catch(() => undefined);
    await settle();

    expect(component.isUploadingImage()).toBeTrue();
    expect(submitButton().disabled).toBeTrue();
  });

  it('REQ-4.28: con una subida en curso «Cancelar» y la «X» del encabezado están deshabilitados', async () => {
    await startUpload();

    expect(cancelButton().disabled).toBeTrue();
    expect(closeButton().disabled).toBeTrue();
  });

  it('REQ-4.28: con una subida en curso onCancel() no cierra el diálogo', async () => {
    await startUpload();

    component.onCancel();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('REQ-4.28: al terminar la subida «Guardar producto», «Cancelar» y la «X» vuelven a habilitarse', async () => {
    await startUpload();

    uploads[0].next({ id: 5, imageUrl: '/uploads/products/x.png' });
    await settle();

    expect(submitButton().disabled).toBeFalse();
    expect(cancelButton().disabled).toBeFalse();
    expect(closeButton().disabled).toBeFalse();
  });

  it('REQ-4.29: onSubmit() con una subida en curso no hace una segunda subida ni el PUT', async () => {
    await startUpload();
    expect(uploadProductImage).toHaveBeenCalledTimes(1);

    await component.onSubmit();
    await settle();

    expect(uploadProductImage).toHaveBeenCalledTimes(1);
    expect(editProduct).not.toHaveBeenCalled();
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
    await configure('/uploads/products/x.png');

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

describe('ProductFormDialogComponent (ia-al-crear-producto)', () => {
  let fixture: ComponentFixture<ProductFormDialogComponent>;
  let component: ProductFormDialogComponent;
  let postProduct: jasmine.Spy;
  let uploadProductImage: jasmine.Spy;
  let analyzeImageFile: jasmine.Spy;
  let analysis: Subject<GenerateProductFromImageResponse>;
  let uploads: Subject<{ id: number; imageUrl: string | null }>[];
  let dialogRef: { close: jasmine.Spy; disableClose: boolean };

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const analyzeButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Analizar imagen con IA"]')!;
  const image = new File(['x'], 'foto.png', { type: 'image/png' });
  const suggestion: GenerateProductFromImageResponse = {
    name: 'Teclado',
    description: 'Teclado con switches rojos',
    categoryId: 1,
    categoryName: 'Teclados',
    slug: 'teclado',
  };
  const chooseFile = async () => {
    const input = el().querySelector<HTMLInputElement>('app-image-field input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(image);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await settle();
  };

  beforeEach(async () => {
    dialogRef = { close: jasmine.createSpy('close'), disableClose: false };
    uploads = [];
    analysis = new Subject<GenerateProductFromImageResponse>();
    analyzeImageFile = jasmine.createSpy('analyzeImageFile').and.callFake(() => analysis);
    postProduct = jasmine.createSpy('postProduct').and.callFake(() => Promise.resolve({ id: 9 } as ProductResModel));
    uploadProductImage = jasmine.createSpy('uploadProductImage').and.callFake(() => {
      const subject = new Subject<{ id: number; imageUrl: string | null }>();
      uploads.push(subject);
      return subject;
    });
    spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [ProductFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DIALOG_DATA, useValue: { mode: 'create' } },
        { provide: DialogRef, useValue: dialogRef },
        { provide: Dialog, useValue: {} },
        { provide: ProductService, useValue: { postProduct, uploadProductImage, analyzeImageFile } },
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => of([{ id: 1, name: 'Teclados', description: '' }]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: NotificationService, useValue: { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
    component.form.patchValue({ name: 'Teclado', price: 100, stock: 3 });
    fixture.detectChanges();
    await chooseFile();
  });

  it('REQ-1.5: analizar la imagen en modo create no crea el producto ni sube la imagen', async () => {
    analyzeButton().click();
    await settle();
    analysis.next(suggestion);
    analysis.complete();
    await settle();

    expect(analyzeImageFile).toHaveBeenCalledOnceWith(image, [{ id: 1, name: 'Teclados' }]);
    expect(postProduct).not.toHaveBeenCalled();
    expect(uploadProductImage).not.toHaveBeenCalled();
  });

  it('REQ-1.16: analizar y luego guardar crea el producto y sube la imagen elegida una sola vez', async () => {
    analyzeButton().click();
    await settle();
    analysis.next(suggestion);
    analysis.complete();
    await settle();
    expect(analyzeImageFile).toHaveBeenCalledTimes(1);

    void component.onSubmit();
    await settle();
    uploads[0]?.next({ id: 9, imageUrl: '/uploads/products/x.png' });
    await settle();

    expect(postProduct).toHaveBeenCalledTimes(1);
    expect(uploadProductImage).toHaveBeenCalledOnceWith(9, image);
  });
});
