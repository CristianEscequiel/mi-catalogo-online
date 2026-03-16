import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CartItemResponse {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  thumbnailUrl: string | null;
  subtotal: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${this.apiUrl}/cart`);
  }

  updateCartItem(productId: number, quantity: number): Observable<CartResponse> {
    return this.http.patch<CartResponse>(`${this.apiUrl}/cart/items/${productId}`, { quantity });
  }

  removeCartItem(productId: number): Observable<CartResponse> {
    return this.http.delete<CartResponse>(`${this.apiUrl}/cart/items/${productId}`);
  }
}
