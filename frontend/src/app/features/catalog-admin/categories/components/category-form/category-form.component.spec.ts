import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';

import { CategoryFormComponent } from './category-form.component';

describe('CategoryFormComponent (profile-and-images)', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;
  let submitted: number;

  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const setup = async (mode: 'create' | 'edit') => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(CategoryFormComponent);
    fixture.componentInstance.categoryForm = fb.group({
      name: fb.control('', { nonNullable: true, validators: [Validators.required] }),
      description: fb.control('', { nonNullable: true }),
      imageUrl: fb.control('', { nonNullable: true }),
    });
    // Se escribe después de crear el control: reset() vuelve al valor inicial ('') y no a este.
    fixture.componentInstance.categoryForm.patchValue({ name: 'Ropa', description: 'Prendas' });
    fixture.componentRef.setInput('mode', mode);
    fixture.componentInstance.submitForm.subscribe(() => submitted++);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(() => {
    submitted = 0;
  });

  it('REQ-4.15: en modo create, tras emitir submitForm el formulario conserva los datos', async () => {
    await setup('create');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(submitted).toBe(1);
    expect(fixture.componentInstance.categoryForm.value.name).toBe('Ropa');
    expect(fixture.componentInstance.categoryForm.value.description).toBe('Prendas');
  });

  it('REQ-4.19: con isSaving deshabilita «Guardar» y «Cancelar»', async () => {
    await setup('edit');
    expect(button('Guardar')!.disabled).toBeFalse();
    expect(button('Cancelar')!.disabled).toBeFalse();

    fixture.componentRef.setInput('isSaving', true);
    await settle();

    expect(button('Guardar')!.disabled).toBeTrue();
    expect(button('Cancelar')!.disabled).toBeTrue();
  });

  it('REQ-4.19: al terminar de guardar vuelve a habilitar «Guardar» y «Cancelar»', async () => {
    await setup('edit');
    fixture.componentRef.setInput('isSaving', true);
    await settle();

    fixture.componentRef.setInput('isSaving', false);
    await settle();

    expect(button('Guardar')!.disabled).toBeFalse();
    expect(button('Cancelar')!.disabled).toBeFalse();
  });
});

describe('CategoryFormComponent (profile-and-images, auditoría M2)', () => {
  let fixture: ComponentFixture<CategoryFormComponent>;

  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) => Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text)!;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fb = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(CategoryFormComponent);
    fixture.componentInstance.categoryForm = fb.group({
      name: fb.control('', { nonNullable: true, validators: [Validators.required] }),
      description: fb.control('', { nonNullable: true }),
      imageUrl: fb.control('', { nonNullable: true }),
    });
    fixture.componentInstance.categoryForm.patchValue({ name: 'Ropa' });
    fixture.componentRef.setInput('mode', 'edit');
    fixture.detectChanges();
    await settle();
  });

  it('REQ-4.27: con isUploadingImage deshabilita «Guardar» y lo vuelve a habilitar al terminar', async () => {
    expect(button('Guardar').disabled).toBeFalse();

    fixture.componentRef.setInput('isUploadingImage', true);
    await settle();
    expect(button('Guardar').disabled).toBeTrue();

    fixture.componentRef.setInput('isUploadingImage', false);
    await settle();
    expect(button('Guardar').disabled).toBeFalse();
  });

  it('REQ-4.28: con isUploadingImage deshabilita «Cancelar» y lo vuelve a habilitar al terminar', async () => {
    expect(button('Cancelar').disabled).toBeFalse();

    fixture.componentRef.setInput('isUploadingImage', true);
    await settle();
    expect(button('Cancelar').disabled).toBeTrue();

    fixture.componentRef.setInput('isUploadingImage', false);
    await settle();
    expect(button('Cancelar').disabled).toBeFalse();
  });
});
