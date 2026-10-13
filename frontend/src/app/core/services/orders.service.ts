import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'DELIVERED';

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
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  total: number;
  createdAt: string;
  items: OrderItemSnapshot[];
  // Estados a los que esta orden puede pasar (los calcula el backend; vacío si ya es final).
  allowedTransitions: OrderStatus[];
}

export interface OrderSummaryResponse {
  id: number;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  allowedTransitions: OrderStatus[];
}

export interface OrderStatusUpdateResponse {
  id: number;
  status: OrderStatus;
  allowedTransitions: OrderStatus[];
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

  updateOrderStatus(orderId: number, status: OrderStatus): Observable<OrderStatusUpdateResponse> {
    return this.http.patch<OrderStatusUpdateResponse>(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }
}
