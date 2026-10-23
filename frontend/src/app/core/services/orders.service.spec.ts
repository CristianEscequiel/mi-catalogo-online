import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { MyOrdersResponse, OrdersService } from './orders.service';

describe('OrdersService (Mis pedidos)', () => {
  let service: OrdersService;
  let http: HttpTestingController;
  const page: MyOrdersResponse = { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('REQ-3.11: getMyOrders(2, 10) pide GET /orders/me?page=2&limit=10', () => {
    let result: MyOrdersResponse | undefined;
    service.getMyOrders(2, 10).subscribe((r) => (result = r));

    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/orders/me`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(page);
    expect(result).toEqual(page);
  });

  it('REQ-3.11: getMyOrders() sin argumentos usa page=1 y limit=10', () => {
    service.getMyOrders().subscribe();

    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/orders/me`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(page);
  });
});
