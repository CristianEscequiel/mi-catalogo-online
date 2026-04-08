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

export interface OrderSummaryResponse {
  id: number;
  customerName: string;
  customerEmail: string;
  total: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'DELIVERED';
  createdAt: string;
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

  getAllOrders(): Observable<OrderSummaryResponse[]> {
    return this.http.get<OrderSummaryResponse[]>(`${this.apiUrl}/orders`);
  }

  updateOrderStatus(orderId: number, status: OrderResponse['status']): Observable<{ id: number; status: OrderResponse['status'] }> {
    return this.http.patch<{ id: number; status: OrderResponse['status'] }>(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }
}
