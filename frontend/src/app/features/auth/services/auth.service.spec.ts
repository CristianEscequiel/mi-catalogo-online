import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const loginUrl = `${API_BASE_URL}/auth/login`;

  beforeEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
    spyOn(console, 'error');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('token');
    localStorage.removeItem('userLite');
  });

  it('REQ-1.2: loginUser exitoso devuelve la respuesta y no escribe en localStorage', async () => {
    const result = firstValueFrom(service.loginUser('ana@example.com', 'secreto'));

    const req = http.expectOne(loginUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@example.com', password: 'secreto' });
    req.flush({ access_token: 'jwt-1', user: { id: 7, email: 'ana@example.com' } });

    expect((await result).access_token).toBe('jwt-1');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userLite')).toBeNull();
  });

  it('REQ-1.10: loginUser con credenciales inválidas (401) propaga el error y no escribe en localStorage', async () => {
    const result = firstValueFrom(service.loginUser('ana@example.com', 'mala'));

    http.expectOne(loginUrl).flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(result).toBeRejected();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userLite')).toBeNull();
  });
});
