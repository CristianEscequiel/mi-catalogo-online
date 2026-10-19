import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { UserLogin } from '../../../core/models/user.model';
import { LoginResponse } from '../models/login-res.model';
import { ProfileResponse } from '../models/profile-res.model';
import { API_BASE_URL } from '../../../core/config/api.config';
import { RegisterRequest } from '../models/register-req.model';

interface VerifyEmailResponse {
  message: string;
}

interface RequestPasswordResetResponse {
  message?: string;
}

interface ResetPasswordResponse {
  message: string;
}

interface ResendVerificationEmailResponse {
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = API_BASE_URL;

loginUser(email: string, password: string): Observable<LoginResponse> {
    const body: UserLogin = {
      email,
      password,
    };
    // La sesión la guarda AuthStore.setAuth (AuthFacade); este servicio no toca localStorage.
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body).pipe(
      catchError(err => {
        console.error('Error en login', err);
        throw err;
      })
    );;
  }

  registerUser(payload: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/register`, payload).pipe(
      catchError(err => {
        console.error('Error en registro', err);
        throw err;
      })
    );
  }

  verifyEmail(token: string): Observable<VerifyEmailResponse> {
    return this.http.get<VerifyEmailResponse>(`${this.apiUrl}/auth/verify-email`, {
      params: { token },
    }).pipe(
      catchError(err => {
        console.error('Error en verificación de email', err);
        throw err;
      })
    );
  }

  resendVerificationEmail(email: string): Observable<ResendVerificationEmailResponse> {
    return this.http.post<ResendVerificationEmailResponse>(`${this.apiUrl}/auth/resend-verification`, {
      email,
    }).pipe(
      catchError(err => {
        console.error('Error al reenviar email de verificacion', err);
        throw err;
      })
    );
  }

  requestPasswordReset(email: string): Observable<RequestPasswordResetResponse> {
    return this.http.post<RequestPasswordResetResponse>(`${this.apiUrl}/auth/request-password-reset`, {
      email,
    }).pipe(
      catchError(err => {
        console.error('Error al solicitar recuperacion de contrasena', err);
        throw err;
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.apiUrl}/auth/reset-password`, {
      token,
      newPassword,
    }).pipe(
      catchError(err => {
        console.error('Error al restablecer la contrasena', err);
        throw err;
      })
    );
  }

  getUserById(id:number){
    return this.http.get<ProfileResponse>(`${this.apiUrl}/users/${id}`)
  }

  updateProfile(id: number, profile: { name: string; lastName: string }): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/users/${id}`, { profile });
  }

  uploadProfileImage(id: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ userId: number; imageUrl: string | null }>(`${this.apiUrl}/users/${id}/profile/image`, formData);
  }

  deleteProfileImage(id: number) {
    return this.http.delete<{ userId: number; imageUrl: string | null }>(`${this.apiUrl}/users/${id}/profile/image`);
  }
}
