import { Dialog } from '@angular/cdk/dialog';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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

describe('ImageFieldComponent (profile-and-images)', () => {
  let fixture: ComponentFixture<ImageFieldComponent>;
  let selected: Array<File | null>;
  let uploads: number;
  let previews: Array<string | null>;
  let consoleLog: jasmine.Spy;

  const el = () => fixture.nativeElement as HTMLElement;
  const img = () => el().querySelector<HTMLImageElement>('img');
  const fileInput = () => el().querySelector<HTMLInputElement>('input[type="file"]')!;
  const alerts = () => Array.from(el().querySelectorAll<HTMLElement>('[role="alert"]'));
  const quitar = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Quitar');
  const setInput = (name: string, value: unknown) => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };
  const fileOf = (type: string, size?: number) => {
    const file = new File(['x'], 'archivo', { type });
    if (size !== undefined) {
      Object.defineProperty(file, 'size', { value: size });
    }
    return file;
  };
  const chooseFile = (file: File) => {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput().files = transfer.files;
    fileInput().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const png = () => fileOf('image/png');
  const pdf = () => fileOf('application/pdf');
  const hugePng = () => fileOf('image/png', Math.round(7.2 * 1024 * 1024));

  beforeEach(() => {
    selected = [];
    previews = [];
    uploads = 0;
    consoleLog = spyOn(console, 'log');
    TestBed.configureTestingModule({
      imports: [ImageFieldComponent],
      providers: [provideZonelessChangeDetection(), { provide: Dialog, useValue: { open: () => ({ closed: of(true) }) } }],
    });
    fixture = TestBed.createComponent(ImageFieldComponent);
    const component = fixture.componentInstance;
    component.autoUploadOnSelect = true;
    component.fileSelected.subscribe((file) => selected.push(file));
    component.uploadRequested.subscribe(() => uploads++);
    // previewChanged todavía no existe: se accede sin tipos para que la suite compile.
    (component as unknown as { previewChanged?: { subscribe: (fn: (url: string | null) => void) => void } }).previewChanged?.subscribe((url) =>
      previews.push(url),
    );
    fixture.detectChanges();
  });

  it('REQ-2.1: junto al selector muestra los formatos permitidos y el tamaño máximo', () => {
    expect(el().textContent).toContain('JPG, PNG o WebP');
    expect(el().textContent).toContain('5 MB');
  });

  it('REQ-2.2: un archivo con formato no permitido no se emite ni se sube', () => {
    chooseFile(pdf());

    expect(selected).toEqual([]);
    expect(uploads).toBe(0);
    expect(previews).toEqual([]);
  });

  it('REQ-2.2: un archivo con file.type vacío no se emite ni se sube', () => {
    chooseFile(fileOf(''));

    expect(selected).toEqual([]);
    expect(uploads).toBe(0);
  });

  it('REQ-2.3: con formato no permitido muestra «Formato no permitido. Usa JPG, PNG o WebP.»', () => {
    chooseFile(pdf());

    expect(el().textContent).toContain('Formato no permitido. Usa JPG, PNG o WebP.');
  });

  it('REQ-2.4: un archivo de más de 5 MB no se emite ni se sube', () => {
    chooseFile(hugePng());

    expect(selected).toEqual([]);
    expect(uploads).toBe(0);
    expect(previews).toEqual([]);
  });

  it('REQ-2.5: un archivo de más de 5 MB muestra el tamaño del archivo y el máximo', () => {
    chooseFile(hugePng());

    expect(el().textContent).toContain('La imagen pesa 7,2 MB y el máximo es 5 MB.');
  });

  it('REQ-2.6: el mensaje de rechazo se anuncia con role="alert"', () => {
    chooseFile(pdf());

    expect(alerts().length).toBe(1);
    expect(alerts()[0].textContent).toContain('Formato no permitido');
  });

  it('REQ-2.7: al elegir luego un archivo válido desaparece el mensaje de rechazo', () => {
    chooseFile(pdf());
    expect(alerts().length).toBe(1);

    chooseFile(png());

    expect(alerts().length).toBe(0);
    expect(el().textContent).not.toContain('Formato no permitido');
  });

  it('REQ-2.7: al descartar la selección (Quitar) desaparece el mensaje de rechazo', () => {
    setInput('mode', 'controls');
    chooseFile(png());
    chooseFile(pdf());
    expect(alerts().length).toBe(1);

    quitar()!.click();
    fixture.detectChanges();

    expect(alerts().length).toBe(0);
  });

  it('REQ-2.8: al rechazar un archivo conserva la selección y la vista previa anteriores', () => {
    const valid = png();
    chooseFile(valid);
    const previewBefore = img()?.getAttribute('src');
    expect(previewBefore).toMatch(/^blob:/);

    chooseFile(pdf());

    expect(selected).toEqual([valid]);
    expect(img()?.getAttribute('src')).toBe(previewBefore);
  });

  it('REQ-2.9: al rechazar un archivo vacía el input para poder volver a elegir el mismo', () => {
    chooseFile(pdf());

    expect(fileInput().value).toBe('');
    expect(fileInput().files?.length).toBe(0);
  });

  it('M5 REQ-2.1: «Quitar» vacía el input para poder volver a elegir el mismo archivo', () => {
    setInput('mode', 'controls');
    chooseFile(png());
    expect(fileInput().files?.length).toBe(1);

    quitar()!.click();
    fixture.detectChanges();

    expect(fileInput().value).toBe('');
    expect(fileInput().files?.length).toBe(0);
  });

  it('M5 REQ-2.2: si llega un imageUrl nuevo con un archivo elegido, vacía el input', () => {
    chooseFile(png());
    expect(fileInput().files?.length).toBe(1);

    setInput('imageUrl', 'https://cdn/ropa.png');

    expect(fileInput().value).toBe('');
    expect(fileInput().files?.length).toBe(0);
  });

  it('REQ-3.1: en modo controls, al elegir un archivo válido avisa la URL temporal de la vista previa', () => {
    setInput('mode', 'controls');

    chooseFile(png());

    expect(previews.length).toBe(1);
    expect(previews[0]).toMatch(/^blob:/);
  });

  it('REQ-3.2: en modo controls, con un archivo elegido ofrece «Quitar», que descarta la selección y avisa null', () => {
    setInput('mode', 'controls');
    expect(quitar()).toBeUndefined();
    chooseFile(png());
    expect(quitar()).toBeDefined();

    quitar()!.click();
    fixture.detectChanges();

    expect(selected[selected.length - 1]).toBeNull();
    expect(previews[previews.length - 1]).toBeNull();
    expect(quitar()).toBeUndefined();
  });

  it('REQ-3.4: al reemplazar el archivo elegido libera la URL temporal anterior', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    setInput('mode', 'controls');
    chooseFile(png());
    const first = previews[0];
    expect(first).toMatch(/^blob:/);

    chooseFile(fileOf('image/webp'));

    expect(revoke).toHaveBeenCalledWith(first!);
  });

  it('REQ-3.4: al descartar la selección libera la URL temporal', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    setInput('mode', 'controls');
    chooseFile(png());
    const url = previews[0];
    expect(url).toMatch(/^blob:/);

    quitar()!.click();

    expect(revoke).toHaveBeenCalledWith(url!);
  });

  it('REQ-3.4: al destruir el componente libera la URL temporal', () => {
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    setInput('mode', 'controls');
    chooseFile(png());
    const url = previews[0];
    expect(url).toMatch(/^blob:/);

    fixture.destroy();

    expect(revoke).toHaveBeenCalledWith(url!);
  });

  it('NFR-5: confirmar el borrado de la imagen no escribe en console.log', () => {
    let deleted = 0;
    fixture.componentInstance.deleteRequested.subscribe(() => deleted++);
    setInput('mode', 'controls');
    setInput('imageUrl', 'https://cdn/ropa.png');

    el().querySelector<HTMLButtonElement>('button[aria-label="Eliminar imagen"]')!.click();

    expect(deleted).toBe(1);
    expect(consoleLog).not.toHaveBeenCalled();
  });
});
