import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface CreateOrderPayload {
  name: string;
  email: string;
  address: string;
}

export interface OrderItemSnapshot {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'DELIVERED';
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  total: number;
  createdAt: string;
  items: OrderItemSnapshot[];
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_BASE_URL;

  placeOrder(payload: CreateOrderPayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/orders`, payload);
  }

  getOrderById(orderId: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.apiUrl}/orders/${orderId}`);
  }
}
