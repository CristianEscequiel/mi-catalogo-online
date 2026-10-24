import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { MyOrderSummary, OrdersService } from '../../core/services/orders.service';
import { orderStatusLabel } from '../../shared/utils/order-status';

@Component({
  standalone: true,
  selector: 'app-my-orders-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './my-orders-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrdersPage implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly notificationService = inject(NotificationService);

  readonly orders = signal<MyOrderSummary[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly canLoadMore = computed(() => this.page() < this.totalPages());
  readonly statusLabel = orderStatusLabel;

  ngOnInit() {
    void this.loadFirstPage();
  }

  async loadFirstPage() {
    this.loading.set(true);
    this.error.set(false);
    try {
      const res = await firstValueFrom(this.ordersService.getMyOrders(1));
      this.orders.set(res.items);
      this.page.set(res.page);
      this.totalPages.set(res.totalPages);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    if (this.loadingMore() || !this.canLoadMore()) {
      return;
    }
    this.loadingMore.set(true);
    try {
      const res = await firstValueFrom(this.ordersService.getMyOrders(this.page() + 1));
      this.orders.set([...this.orders(), ...res.items]);
      this.page.set(res.page);
      this.totalPages.set(res.totalPages);
    } catch {
      this.notificationService.error('No pudimos cargar más pedidos.');
    } finally {
      this.loadingMore.set(false);
    }
  }
}
