import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateOrderPayload {
  name: string;
  email: string;
  address: string;
}

export interface CreateOrderResponse {
  orderId: number;
  total: number;
  itemsCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  placeOrder(payload: CreateOrderPayload): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.apiUrl}/orders`, payload);
  }
}
