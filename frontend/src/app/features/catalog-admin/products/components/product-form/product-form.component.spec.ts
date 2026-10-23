import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Observable, of, Subject, throwError } from 'rxjs';
import { CategoryResModel } from '../../../../../core/data-access/categories/category.model';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AuthStore } from '../../../../../core/state/auth.store';
import { CategoryService } from '../../../../../core/data-access/categories/category.service';
import { GenerateProductFromImageResponse, ProductService } from '../../../../../core/data-access/products/product.service';
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

describe('PrdFormComponent (profile-and-images)', () => {
  let fixture: ComponentFixture<PrdFormComponent>;
  let submitted: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const previewImg = () => el().querySelector<HTMLImageElement>('img[alt="Vista previa del producto"]');
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const chooseFile = async (file: File) => {
    const input = el().querySelector<HTMLInputElement>('app-image-field input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await settle();
  };
  const png = () => new File(['x'], 'foto.png', { type: 'image/png' });
  const quitar = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Quitar');

  const setup = async (mode: 'create' | 'edit') => {
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
      price: fb.control(100),
      stock: fb.control(3),
      categoryIds: fb.control<number[]>([]),
      thumbnailUrl: fb.control<string | null>(null),
      status: fb.control('DRAFT'),
    });
    fixture.componentRef.setInput('mode', mode);
    fixture.componentInstance.submitForm.subscribe(() => submitted++);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    submitted = 0;
  });

  it('REQ-3.1: al elegir un archivo válido el panel «Vista previa del producto» lo muestra en lugar de «Sin imagen seleccionada»', async () => {
    await setup('create');
    expect(previewImg()).toBeNull();
    expect(el().textContent).toContain('Sin imagen seleccionada');

    await chooseFile(png());

    expect(previewImg()?.getAttribute('src')).toMatch(/^blob:/);
    expect(el().textContent).not.toContain('Sin imagen seleccionada');
  });

  it('REQ-3.1: al elegir un archivo válido el panel lo muestra en lugar de la imagen guardada', async () => {
    await setup('create');
    fixture.componentRef.setInput('imageUrl', 'https://cdn/guardada.png');
    await settle();
    expect(previewImg()?.getAttribute('src')).toBe('https://cdn/guardada.png');

    await chooseFile(png());

    expect(previewImg()?.getAttribute('src')).toMatch(/^blob:/);
  });

  it('REQ-3.1: al quitar el archivo elegido el panel vuelve a «Sin imagen seleccionada»', async () => {
    await setup('create');
    await chooseFile(png());

    quitar()!.click();
    await settle();

    expect(previewImg()).toBeNull();
    expect(el().textContent).toContain('Sin imagen seleccionada');
  });

  it('REQ-3.3: en modo create con un archivo elegido muestra «La imagen se subirá al guardar el producto.»', async () => {
    await setup('create');
    expect(el().textContent).not.toContain('La imagen se subirá al guardar el producto.');

    await chooseFile(png());

    expect(el().textContent).toContain('La imagen se subirá al guardar el producto.');
  });

  it('REQ-3.5: cuando llega la imagen guardada el panel muestra esa imagen en lugar de la miniatura local', async () => {
    await setup('create');
    await chooseFile(png());
    expect(previewImg()?.getAttribute('src')).toMatch(/^blob:/);

    fixture.componentRef.setInput('imageUrl', 'https://cdn/guardada.png');
    await settle();

    expect(previewImg()?.getAttribute('src')).toBe('https://cdn/guardada.png');
  });

  it('REQ-4.4: en modo create, tras emitir submitForm el formulario conserva los datos', async () => {
    await setup('create');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(submitted).toBe(1);
    expect(fixture.componentInstance.productForm.value.name).toBe('Teclado');
    expect(fixture.componentInstance.productForm.value.price).toBe(100);
  });
});

describe('PrdFormComponent (profile-and-images, auditoría M2 y M4)', () => {
  let fixture: ComponentFixture<PrdFormComponent>;

  const el = () => fixture.nativeElement as HTMLElement;
  const previewImg = () => el().querySelector<HTMLImageElement>('img[alt="Vista previa del producto"]');
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const cancelButton = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Cancelar')!;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const chooseFile = async () => {
    const input = el().querySelector<HTMLInputElement>('app-image-field input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'foto.png', { type: 'image/png' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await settle();
  };

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
      price: fb.control(100),
      stock: fb.control(3),
      categoryIds: fb.control<number[]>([]),
      thumbnailUrl: fb.control<string | null>(null),
      status: fb.control('DRAFT'),
    });
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('imageUrl', 'https://cdn/anterior.png');
    fixture.detectChanges();
    await settle();
  });

  it('REQ-3.6: si imageUrl pasa a nulo con un archivo elegido sin subir el panel conserva la vista previa local', async () => {
    await chooseFile();
    expect(previewImg()?.getAttribute('src')).toMatch(/^blob:/);

    fixture.componentRef.setInput('imageUrl', null);
    await settle();

    expect(previewImg()?.getAttribute('src')).toMatch(/^blob:/);
  });

  it('REQ-3.6: tras conservar la vista previa, una imagen guardada nueva la reemplaza', async () => {
    await chooseFile();
    fixture.componentRef.setInput('imageUrl', null);
    await settle();

    fixture.componentRef.setInput('imageUrl', 'https://cdn/nueva.png');
    await settle();

    expect(previewImg()?.getAttribute('src')).toBe('https://cdn/nueva.png');
  });

  it('REQ-4.27: con isUploadingImage deshabilita «Guardar producto» y lo vuelve a habilitar al terminar', async () => {
    expect(submitButton().disabled).toBeFalse();

    fixture.componentRef.setInput('isUploadingImage', true);
    await settle();
    expect(submitButton().disabled).toBeTrue();

    fixture.componentRef.setInput('isUploadingImage', false);
    await settle();
    expect(submitButton().disabled).toBeFalse();
  });

  it('REQ-4.28: con isUploadingImage deshabilita «Cancelar» y lo vuelve a habilitar al terminar', async () => {
    expect(cancelButton().disabled).toBeFalse();

    fixture.componentRef.setInput('isUploadingImage', true);
    await settle();
    expect(cancelButton().disabled).toBeTrue();

    fixture.componentRef.setInput('isUploadingImage', false);
    await settle();
    expect(cancelButton().disabled).toBeFalse();
  });
});

describe('PrdFormComponent (ia-al-crear-producto)', () => {
  let fixture: ComponentFixture<PrdFormComponent>;
  let analyzeImageFile: jasmine.Spy;
  let generateFromImage: jasmine.Spy;
  let dialogOpen: jasmine.Spy;
  let notifications: { success: jasmine.Spy; error: jasmine.Spy; info: jasmine.Spy };
  let analysis: Subject<GenerateProductFromImageResponse>;
  let selectedEvents: (File | null)[];

  const TECLADOS = { id: 1, name: 'Teclados', description: '' } as CategoryResModel;
  const NO_CATEGORIES_MSG = 'No hay categorías disponibles para sugerir una coincidencia.';
  const ANALYZE_ERROR_MSG = 'No se pudo analizar la imagen con IA.';
  const suggestion: GenerateProductFromImageResponse = {
    name: 'Teclado mecánico',
    description: 'Teclado con switches rojos',
    categoryId: 1,
    categoryName: 'Teclados',
    slug: 'teclado-mecanico',
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const analyzeButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Analizar imagen con IA"]')!;
  const generateButton = () => el().querySelector<HTMLButtonElement>('button[aria-label="Generar descripción y slug con IA"]')!;
  const saveButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const previewImg = () => el().querySelector<HTMLImageElement>('img[alt="Vista previa del producto"]');
  const quitar = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Quitar');
  const chooseFile = async (file: File) => {
    const input = el().querySelector<HTMLInputElement>('app-image-field input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await settle();
  };
  const png = (name = 'foto.png') => new File(['x'], name, { type: 'image/png' });
  const pdf = () => new File(['x'], 'doc.pdf', { type: 'application/pdf' });
  const clickAnalyze = async () => {
    analyzeButton().click();
    await settle();
  };
  const formValue = () => fixture.componentInstance.productForm.getRawValue();

  const setup = async (
    mode: 'create' | 'edit',
    options: { imageUrl?: string | null; categories?: Observable<CategoryResModel[]>; name?: string; description?: string } = {},
  ) => {
    analysis = new Subject<GenerateProductFromImageResponse>();
    analyzeImageFile = jasmine.createSpy('analyzeImageFile').and.callFake(() => analysis);
    generateFromImage = jasmine.createSpy('generateFromImage').and.callFake(() => analysis);
    dialogOpen = jasmine.createSpy('open').and.callFake(() => ({ closed: of(true) }));
    notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
    selectedEvents = [];
    spyOn(console, 'error');

    await TestBed.configureTestingModule({
      imports: [PrdFormComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductService, useValue: { analyzeImageFile, generateFromImage } },
        { provide: CategoryService, useValue: { getCategoriesByUserId: () => options.categories ?? of([TECLADOS]) } },
        { provide: AuthStore, useValue: { userLite: () => ({ id: 1 }) } },
        { provide: Dialog, useValue: { open: dialogOpen } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    const fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(PrdFormComponent);
    fixture.componentInstance.productForm = fb.group({
      name: fb.control(options.name ?? ''),
      description: fb.control(options.description ?? ''),
      slug: fb.control(''),
      sku: fb.control(''),
      price: fb.control(100),
      stock: fb.control(3),
      categoryIds: fb.control<number[]>([]),
      thumbnailUrl: fb.control<string | null>(null),
      status: fb.control('DRAFT'),
    });
    fixture.componentRef.setInput('mode', mode);
    if (options.imageUrl !== undefined) {
      fixture.componentRef.setInput('imageUrl', options.imageUrl);
    }
    fixture.componentInstance.imageFileSelected.subscribe((file) => selectedEvents.push(file));
    fixture.detectChanges();
    await settle();
  };

  it('REQ-1.1: en modo create, al elegir una imagen válida «Analizar imagen con IA» queda habilitado', async () => {
    await setup('create');

    await chooseFile(png());

    expect(analyzeButton().disabled).toBeFalse();
  });

  it('REQ-1.2: en modo create sin imagen elegida «Analizar imagen con IA» está deshabilitado', async () => {
    await setup('create');

    expect(analyzeButton().disabled).toBeTrue();
  });

  it('REQ-1.3: al quitar la imagen elegida «Analizar imagen con IA» vuelve a estar deshabilitado', async () => {
    await setup('create');
    await chooseFile(png());
    expect(analyzeButton().disabled).toBeFalse();

    quitar()!.click();
    await settle();

    expect(analyzeButton().disabled).toBeTrue();
  });

  it('REQ-1.3a: un archivo rechazado no emite fileSelected y se conserva el válido anterior como imagen a analizar', async () => {
    await setup('create');
    const valid = png();
    await chooseFile(valid);
    expect(selectedEvents).toEqual([valid]);

    await chooseFile(pdf());

    expect(selectedEvents).toEqual([valid]);
    expect(analyzeButton().disabled).toBeFalse();
    await clickAnalyze();
    expect(analyzeImageFile.calls.mostRecent().args[0]).toBe(valid);
  });

  it('REQ-1.15: mientras las categorías cargan «Analizar imagen con IA» está deshabilitado y se habilita al terminar', async () => {
    const loading = new Subject<CategoryResModel[]>();
    await setup('create', { categories: loading });
    await chooseFile(png());
    expect(analyzeButton().disabled).toBeTrue();

    loading.next([TECLADOS]);
    loading.complete();
    await settle();

    expect(analyzeButton().disabled).toBeFalse();
  });

  it('REQ-1.17: en modo edit con imagen subida «Analizar imagen con IA» está habilitado', async () => {
    await setup('edit', { imageUrl: '/uploads/products/x.png' });

    expect(analyzeButton().disabled).toBeFalse();
  });

  it('REQ-1.17: en modo edit con imagen subida analiza por URL con generateFromImage y no con el archivo', async () => {
    await setup('edit', { imageUrl: '/uploads/products/x.png' });

    await clickAnalyze();

    expect(generateFromImage).toHaveBeenCalledTimes(1);
    expect(generateFromImage.calls.mostRecent().args[0].imageUrl).toContain('/uploads/products/x.png');
    expect(generateFromImage.calls.mostRecent().args[0].categories).toEqual([{ id: 1, name: 'Teclados' }]);
    expect(analyzeImageFile).not.toHaveBeenCalled();
  });

  it('REQ-1.18: en modo edit sin imagen subida y con archivo local elegido el botón está habilitado', async () => {
    await setup('edit', { imageUrl: null });
    expect(analyzeButton().disabled).toBeTrue();

    await chooseFile(png());

    expect(analyzeButton().disabled).toBeFalse();
  });

  it('REQ-1.18: en modo edit sin imagen subida analiza el archivo local con analyzeImageFile', async () => {
    await setup('edit', { imageUrl: null });
    const file = png();
    await chooseFile(file);

    await clickAnalyze();

    expect(analyzeImageFile).toHaveBeenCalledOnceWith(file, [{ id: 1, name: 'Teclados' }]);
    expect(generateFromImage).not.toHaveBeenCalled();
  });

  it('REQ-1.19: si falla la carga de categorías el botón no queda deshabilitado por «cargando»', async () => {
    await setup('create', { categories: throwError(() => new Error('boom')) });

    await chooseFile(png());

    expect(analyzeButton().disabled).toBeFalse();
  });

  it('REQ-1.19: tras el error de carga y con imagen elegida, pulsar el botón avisa que no hay categorías sin llamar al backend', async () => {
    await setup('create', { categories: throwError(() => new Error('boom')) });
    await chooseFile(png());

    await clickAnalyze();

    expect(notifications.error).toHaveBeenCalledOnceWith(NO_CATEGORIES_MSG);
    expect(analyzeImageFile).not.toHaveBeenCalled();
    expect(generateFromImage).not.toHaveBeenCalled();
  });

  it('REQ-1.14: con las categorías cargadas y la lista vacía avisa «No hay categorías disponibles…» sin llamar al backend', async () => {
    await setup('create', { categories: of([]) });
    await chooseFile(png());

    await clickAnalyze();

    expect(notifications.error).toHaveBeenCalledOnceWith(NO_CATEGORIES_MSG);
    expect(analyzeImageFile).not.toHaveBeenCalled();
  });

  it('REQ-1.4: en modo create envía el archivo elegido y las categorías disponibles a analyzeImageFile', async () => {
    await setup('create');
    const file = png();
    await chooseFile(file);

    await clickAnalyze();

    expect(analyzeImageFile).toHaveBeenCalledOnceWith(file, [{ id: 1, name: 'Teclados' }]);
    expect(generateFromImage).not.toHaveBeenCalled();
  });

  it('REQ-1.6: mientras analiza el botón está deshabilitado y muestra «Analizando imagen...»', async () => {
    await setup('create');
    await chooseFile(png());

    await clickAnalyze();

    expect(analyzeButton().disabled).toBeTrue();
    expect(analyzeButton().textContent).toContain('Analizando imagen...');
  });

  it('REQ-1.7: mientras analiza «Generar descripción y slug» está deshabilitado', async () => {
    await setup('create', { name: 'Teclado' });
    await chooseFile(png());
    expect(generateButton().disabled).toBeFalse();

    await clickAnalyze();

    expect(generateButton().disabled).toBeTrue();
  });

  it('REQ-1.8: mientras analiza el botón de guardar está deshabilitado y se habilita al terminar', async () => {
    await setup('create', { name: 'Teclado' });
    await chooseFile(png());
    expect(saveButton().disabled).toBeFalse();

    await clickAnalyze();
    expect(saveButton().disabled).toBeTrue();

    analysis.next(suggestion);
    analysis.complete();
    await settle();
    expect(saveButton().disabled).toBeFalse();
  });

  it('REQ-1.9: una sugerencia para campos vacíos los completa sin pedir confirmación', async () => {
    await setup('create');
    await chooseFile(png());
    await clickAnalyze();

    analysis.next(suggestion);
    analysis.complete();
    await settle();

    expect(formValue().name).toBe('Teclado mecánico');
    expect(formValue().description).toBe('Teclado con switches rojos');
    expect(formValue().slug).toBe('teclado-mecanico');
    expect(formValue().categoryIds).toEqual([1]);
    expect(dialogOpen).not.toHaveBeenCalled();
  });

  it('REQ-1.10: una sugerencia distinta para un campo con contenido pide confirmación antes de reemplazarlo', async () => {
    await setup('create', { name: 'Otro nombre' });
    await chooseFile(png());
    await clickAnalyze();

    analysis.next(suggestion);
    analysis.complete();
    await settle();

    expect(dialogOpen).toHaveBeenCalledTimes(1);
    expect(formValue().name).toBe('Teclado mecánico');
  });

  it('REQ-1.10: si el usuario conserva el valor, el campo con contenido no se reemplaza', async () => {
    await setup('create', { name: 'Otro nombre' });
    dialogOpen.and.callFake(() => ({ closed: of(false) }));
    await chooseFile(png());
    await clickAnalyze();

    analysis.next(suggestion);
    analysis.complete();
    await settle();

    expect(dialogOpen).toHaveBeenCalledTimes(1);
    expect(formValue().name).toBe('Otro nombre');
  });

  it('REQ-1.11: si el análisis falla muestra «No se pudo analizar la imagen con IA.»', async () => {
    await setup('create');
    await chooseFile(png());
    await clickAnalyze();

    analysis.error(new Error('502'));
    await settle();

    expect(notifications.error).toHaveBeenCalledOnceWith(ANALYZE_ERROR_MSG);
  });

  it('REQ-1.12: si el análisis falla deja los campos del formulario y la imagen elegida como estaban', async () => {
    await setup('create', { name: 'Mi producto', description: 'Mi descripción' });
    await chooseFile(png());
    const before = formValue();
    const previewBefore = previewImg()?.getAttribute('src');
    await clickAnalyze();

    analysis.error(new Error('502'));
    await settle();

    expect(formValue()).toEqual(before);
    expect(previewBefore).toMatch(/^blob:/);
    expect(previewImg()?.getAttribute('src')).toBe(previewBefore!);
    expect(analyzeButton().disabled).toBeFalse();
  });

  it('REQ-1.13: si el análisis falla «Analizar imagen con IA» vuelve a habilitarse y se puede reintentar', async () => {
    await setup('create');
    await chooseFile(png());
    await clickAnalyze();
    expect(analyzeButton().disabled).toBeTrue();

    analysis.error(new Error('502'));
    await settle();

    expect(analyzeButton().disabled).toBeFalse();
    expect(analyzeButton().textContent).toContain('Analizar imagen con IA');
  });

  it('REQ-1.20: si el componente se destruye durante el análisis, la respuesta no aplica sugerencias ni avisos', async () => {
    await setup('create', { name: 'Otro nombre' });
    await chooseFile(png());
    await clickAnalyze();
    expect(analyzeImageFile).toHaveBeenCalledTimes(1);
    const before = formValue();

    fixture.destroy();
    analysis.next(suggestion);
    analysis.complete();
    await Promise.resolve();

    expect(dialogOpen).not.toHaveBeenCalled();
    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.info).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
    expect(formValue()).toEqual(before);
  });
});
