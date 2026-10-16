import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageFieldComponent } from './image-field.component';

describe('ImageFieldComponent', () => {
  let fixture: ComponentFixture<ImageFieldComponent>;
  let selected: Array<File | null>;

  const el = () => fixture.nativeElement as HTMLElement;
  const img = () => el().querySelector<HTMLImageElement>('img');
  const setInput = (name: string, value: unknown) => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  const chooseFile = (file: File) => {
    const input = el().querySelector<HTMLInputElement>('input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    selected = [];
    TestBed.configureTestingModule({
      imports: [ImageFieldComponent],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(ImageFieldComponent);
    fixture.componentInstance.fileSelected.subscribe((file) => selected.push(file));
    fixture.detectChanges();
  });

  it('REQ-2.2: sin imagen ni archivo muestra el botón "+ Seleccionar imagen" y no hay vista previa', () => {
    expect(el().textContent).toContain('+ Seleccionar imagen');
    expect(img()).toBeNull();
  });

  it('REQ-2.2: al elegir un archivo muestra la vista previa y avisa el archivo elegido', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });

    chooseFile(file);

    expect(img()?.getAttribute('src')).toMatch(/^blob:/);
    expect(selected).toEqual([file]);
  });

  it('REQ-2.2: si llega un imageUrl nuevo después de elegir un archivo, descarta la vista previa y muestra la imagen del servidor', () => {
    chooseFile(new File(['x'], 'foto.png', { type: 'image/png' }));

    setInput('imageUrl', 'https://cdn/ropa.png');

    expect(img()?.getAttribute('src')).toBe('https://cdn/ropa.png');
    expect(selected[selected.length - 1]).toBeNull();
  });

  it('REQ-2.2: en modo controls, mientras sube muestra "Subiendo imagen..."', () => {
    setInput('mode', 'controls');
    expect(el().textContent).toContain('Subir imagen');

    setInput('isUploading', true);

    expect(el().textContent).toContain('Subiendo imagen...');
    expect(el().textContent).toContain('Procesando imagen...');
  });

  it('REQ-2.2: muestra el mensaje de error que recibe por input', () => {
    setInput('errorMessage', 'No se pudo subir la imagen.');

    expect(el().textContent).toContain('No se pudo subir la imagen.');
  });
});
