import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductResModel } from '../../features/catalog-admin/products/models/prd-res.model';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_BASE_URL;

  getFavorites(): Observable<ProductResModel[]> {
    return this.http.get<ProductResModel[]>(`${this.apiUrl}/favorites`);
  }

  addFavorite(productId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/favorites/${productId}`, {});
  }

  removeFavorite(productId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/favorites/${productId}`);
  }
}
