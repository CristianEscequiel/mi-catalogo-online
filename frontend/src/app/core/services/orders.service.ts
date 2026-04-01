import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

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
  private readonly apiUrl = API_BASE_URL;

  placeOrder(payload: CreateOrderPayload): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.apiUrl}/orders`, payload);
  }
}
