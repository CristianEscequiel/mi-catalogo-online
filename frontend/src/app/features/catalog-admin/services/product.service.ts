import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ProfileResponse } from '../../auth/models/profile-res.model';
import { ProductModel } from '../models/product.model';
import { firstValueFrom, Observable } from 'rxjs';

interface categoryModel {
  id: number;
  name: string;
  descripcion: string;
  imageUrl: string
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

  getUserById(id: number) {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/users/${id}`)
  }

  async postProduct(body: ProductModel) {
    const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/products`, body))
    return res
  }

  getCategories(): Observable<categoryModel[]> {
    return this.http.get<categoryModel[]>(`${this.apiUrl}/categories`);
  }

  getAllProducts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products`);
  }

  async editProduct(id:number , body:ProductModel): Promise<Observable<any>>{
   const res = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/products/${id}`, body))
  return res
  }
}
