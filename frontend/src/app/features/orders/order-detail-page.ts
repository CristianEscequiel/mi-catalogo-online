import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderResponse, OrdersService } from '../../core/services/orders.service';
import { OrderPaymentInfo } from '../../shared/components/order-payment-info/order-payment-info';
import { orderStatusLabel } from '../../shared/utils/order-status';

@Component({
  standalone: true,
  selector: 'app-order-detail-page',
  imports: [RouterLink, DatePipe, DecimalPipe, OrderPaymentInfo],
  templateUrl: './order-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);

  readonly loading = signal(true);
  readonly order = signal<OrderResponse | null>(null);
  readonly statusLabel = orderStatusLabel;

  ngOnInit() {
    void this.loadOrder();
  }

  private async loadOrder() {
    const raw = this.route.snapshot.paramMap.get('id') ?? '';
    const id = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id <= 0) {
      this.loading.set(false);
      return;
    }

    try {
      this.order.set(await firstValueFrom(this.ordersService.getOrderById(id)));
    } catch {
      this.order.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
