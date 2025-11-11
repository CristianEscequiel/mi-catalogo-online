import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';
import { UserLogin } from '../../../core/models/user.model';
import { LoginResponse } from '../models/login-res.model';
import { ProfileResponse } from '../models/profile-res.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

loginUser(email: string, password: string): Observable<LoginResponse> {
    const body: UserLogin = {
      email,
      password,
    };
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
      }),
      catchError(err => {
        console.error('Error en login', err);
        throw err;
      })
    );;
  }
  getUserById(id:number){
    return this.http.get<ProfileResponse>(`${this.apiUrl}/users/${id}`)
  }

  postItems(){
    const body = {
        title: "Los gatos: compañeros misteriosos y encantadores",
        categoryIds: [1 , 2 , 3  , 4],
        content:"Lorem impsum djsakdjslñadalskdjas"
    }
    return this.http.post<any>(`${this.apiUrl}/posts`, body )
  }
}
