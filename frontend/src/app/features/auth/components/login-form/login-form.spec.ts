import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../services/auth.facade';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let component: LoginForm;
  let fixture: ComponentFixture<LoginForm>;
  let resolveLogin: () => void;
  let rejectLogin: (reason?: unknown) => void;
  let loginUser: jasmine.Spy;

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

  // Escribe como lo haría el usuario: con un evento "input" del DOM.
  const type = (id: string, value: string) => {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const fillAndSubmit = async () => {
    type('email', 'ana@example.com');
    type('password', 'secreto');
    submitButton().click();
    await settle();
  };

  beforeEach(async () => {
    loginUser = jasmine.createSpy('loginUser').and.callFake(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveLogin = resolve;
          rejectLogin = reject;
        }),
    );
    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthFacade, useValue: { loginUser } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('REQ-2.2: con el formulario vacío el botón está deshabilitado y dice "Iniciar sesion"', () => {
    expect(submitButton().disabled).toBeTrue();
    expect(submitButton().textContent).toContain('Iniciar sesion');
  });

  it('REQ-2.2: mientras inicia sesión muestra "Ingresando..." con el botón deshabilitado, y al terminar vuelve a "Iniciar sesion"', async () => {
    await fillAndSubmit();

    expect(loginUser).toHaveBeenCalledOnceWith('ana@example.com', 'secreto', '/home');
    expect(submitButton().textContent).toContain('Ingresando...');
    expect(submitButton().disabled).toBeTrue();

    resolveLogin();
    await settle();

    expect(submitButton().textContent).toContain('Iniciar sesion');
    expect(submitButton().textContent).not.toContain('Ingresando...');
  });

  it('REQ-2.2: si el login falla vuelve a "Iniciar sesion", habilita el botón y conserva lo escrito', async () => {
    await fillAndSubmit();
    expect(submitButton().textContent).toContain('Ingresando...');

    rejectLogin(new Error('LOGIN_FAILED'));
    await settle();

    expect(submitButton().textContent).toContain('Iniciar sesion');
    expect(submitButton().disabled).toBeFalse();
    expect(input('email').value).toBe('ana@example.com');
  });

  it('REQ-2.2: al alternar showPassword cambia el tipo del campo de contraseña', () => {
    expect(input('password').type).toBe('password');

    component.togglePassword();
    fixture.detectChanges();

    expect(input('password').type).toBe('text');
  });
});
