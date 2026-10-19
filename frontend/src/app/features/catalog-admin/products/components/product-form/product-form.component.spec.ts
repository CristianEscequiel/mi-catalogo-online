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
