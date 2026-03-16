import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductResModel } from '../../features/catalog-admin/products/models/prd-res.model';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

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
