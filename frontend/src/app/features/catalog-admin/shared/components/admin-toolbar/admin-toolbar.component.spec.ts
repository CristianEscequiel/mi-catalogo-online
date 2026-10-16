import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { AdminToolbarComponent } from './admin-toolbar.component';

describe('AdminToolbarComponent', () => {
  let fixture: ComponentFixture<AdminToolbarComponent>;

  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdminToolbarComponent], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(AdminToolbarComponent);
    fixture.componentRef.setInput('searchControl', new FormControl('', { nonNullable: true }));
    fixture.detectChanges();
  });

  it('REQ-2.2: muestra el texto del botón y el placeholder que recibe por input, y los actualiza si cambian', () => {
    fixture.componentRef.setInput('buttonLabel', '+ Nuevo Producto');
    fixture.componentRef.setInput('searchPlaceholder', 'Buscar producto');
    fixture.detectChanges();

    expect(el().querySelector('button')?.textContent).toContain('+ Nuevo Producto');
    expect(el().querySelector('input')?.getAttribute('placeholder')).toBe('Buscar producto');

    fixture.componentRef.setInput('buttonLabel', '+ Nueva Categoría');
    fixture.detectChanges();

    expect(el().querySelector('button')?.textContent).toContain('+ Nueva Categoría');
  });

  it('REQ-2.2: al hacer clic en el botón emite "create"', () => {
    const emitted: number[] = [];
    fixture.componentInstance.create.subscribe(() => emitted.push(1));

    el().querySelector('button')!.click();

    expect(emitted.length).toBe(1);
  });

  it('REQ-2.2: lo que se escribe llega al FormControl recibido', () => {
    const input = el().querySelector<HTMLInputElement>('input')!;
    input.value = 'remera';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.searchControl.value).toBe('remera');
  });
});
