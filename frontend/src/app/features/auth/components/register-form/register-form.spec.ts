import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../services/auth.facade';
import { RegisterForm } from './register-form';

describe('RegisterForm', () => {
  let component: RegisterForm;
  let fixture: ComponentFixture<RegisterForm>;
  let resolveRegister: () => void;
  let rejectRegister: (reason?: unknown) => void;
  let registerUser: jasmine.Spy;

  const el = () => fixture.nativeElement as HTMLElement;
  const input = (id: string) => el().querySelector<HTMLInputElement>(`#${id}`)!;
  const submitButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
    }
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const type = (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const fillAndSubmit = async () => {
    type('name', 'Ana');
    type('lastName', 'Gómez');
    type('email', 'ana@example.com');
    type('password', 'secreto');
    submitButton().click();
    await settle();
  };

  beforeEach(async () => {
    registerUser = jasmine.createSpy('registerUser').and.callFake(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveRegister = resolve;
          rejectRegister = reject;
        }),
    );
    await TestBed.configureTestingModule({
      imports: [RegisterForm],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthFacade, useValue: { registerUser } }],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('REQ-2.2: con el formulario vacío el botón está deshabilitado y dice "Registrarme"', () => {
    expect(submitButton().disabled).toBeTrue();
    expect(submitButton().textContent).toContain('Registrarme');
  });

  it('REQ-2.2: mientras se registra muestra "Creando cuenta..." con el botón deshabilitado, y al terminar vuelve a "Registrarme"', async () => {
    await fillAndSubmit();

    expect(registerUser).toHaveBeenCalledTimes(1);
    expect(submitButton().textContent).toContain('Creando cuenta...');
    expect(submitButton().disabled).toBeTrue();

    resolveRegister();
    await settle();

    expect(submitButton().textContent).toContain('Registrarme');
    expect(submitButton().textContent).not.toContain('Creando cuenta...');
  });

  it('REQ-2.2: si el registro falla vuelve a "Registrarme", habilita el botón y conserva lo escrito', async () => {
    await fillAndSubmit();
    expect(submitButton().textContent).toContain('Creando cuenta...');

    rejectRegister(new Error('REGISTER_FAILED'));
    await settle();

    expect(submitButton().textContent).toContain('Registrarme');
    expect(submitButton().disabled).toBeFalse();
    expect(input('email').value).toBe('ana@example.com');
  });
});
