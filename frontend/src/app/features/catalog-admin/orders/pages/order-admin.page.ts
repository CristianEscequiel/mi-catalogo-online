import { CdkTableModule } from '@angular/cdk/table';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification.service';
import { OrderResponse, OrderSummaryResponse, OrdersService } from '../../../../core/services/orders.service';

type OrderStatus = OrderResponse['status'];

@Component({
  standalone: true,
  selector: 'app-order-admin-page',
  imports: [CdkTableModule, ReactiveFormsModule, DecimalPipe, DatePipe],
  templateUrl: './order-admin.page.html',
})
export class OrderAdminPage implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly notificationService = inject(NotificationService);

  readonly displayedColumns = ['id', 'customerName', 'customerEmail', 'total', 'status', 'createdAt'];
  readonly orders = signal<OrderSummaryResponse[]>([]);
  readonly filteredOrders = signal<OrderSummaryResponse[]>([]);
  readonly selectedOrder = signal<OrderResponse | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly statusLoading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusFilterControl = new FormControl<'ALL' | OrderStatus>('ALL', { nonNullable: true });

  ngOnInit(): void {
    this.loadOrders();
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
    this.statusFilterControl.valueChanges.subscribe(() => this.applyFilters());
  }

  async loadOrders() {
    try {
      this.loading.set(true);
      const orders = await firstValueFrom(this.ordersService.getAllOrders());
      this.orders.set(orders);
      this.applyFilters();
    } catch {
      this.notificationService.error('No se pudieron cargar los pedidos.');
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    const term = this.searchControl.value.toLowerCase().trim();
    const statusFilter = this.statusFilterControl.value;

    let data = [...this.orders()];

    if (term) {
      data = data.filter((order) => order.customerName.toLowerCase().includes(term) || order.customerEmail.toLowerCase().includes(term));
    }

    if (statusFilter !== 'ALL') {
      data = data.filter((order) => order.status === statusFilter);
    }

    this.filteredOrders.set(data);
  }

  async selectOrder(orderId: number) {
    try {
      this.detailLoading.set(true);
      const order = await firstValueFrom(this.ordersService.getOrderById(orderId));
      this.selectedOrder.set(order);
    } catch {
      this.notificationService.error('No se pudo cargar el detalle del pedido.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  async updateSelectedOrderStatus(nextStatus: string) {
    const order = this.selectedOrder();
    if (!order) {
      return;
    }

    const status = nextStatus as OrderStatus;
    if (status === order.status) {
      return;
    }

    try {
      this.statusLoading.set(true);
      const response = await firstValueFrom(this.ordersService.updateOrderStatus(order.id, status));
      this.selectedOrder.set({
        ...order,
        status: response.status,
      });

      this.orders.update((items) => items.map((item) => (item.id === order.id ? { ...item, status: response.status } : item)));
      this.applyFilters();
      this.notificationService.success('Estado actualizado correctamente.');
    } catch {
      this.notificationService.error('No se pudo actualizar el estado del pedido.');
    } finally {
      this.statusLoading.set(false);
    }
  }

  statusLabel(status: OrderStatus) {
    if (status === 'PENDING_PAYMENT') {
      return 'Esperando transferencia';
    }
    if (status === 'PAID') {
      return 'Pagado';
    }
    if (status === 'CANCELLED') {
      return 'Cancelado';
    }
    return 'Entregado';
  }

  statusShortLabel(status: OrderStatus) {
    if (status === 'PENDING_PAYMENT') {
      return 'Pendiente';
    }
    if (status === 'PAID') {
      return 'Pagado';
    }
    if (status === 'CANCELLED') {
      return 'Cancelado';
    }
    return 'Entregado';
  }

  statusBadgeClass(status: OrderStatus) {
    if (status === 'PENDING_PAYMENT') {
      return 'badge-warning';
    }
    if (status === 'PAID') {
      return 'badge-success';
    }
    if (status === 'CANCELLED') {
      return 'badge-error';
    }
    return 'badge-info';
  }
}
