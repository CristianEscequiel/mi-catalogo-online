import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderResponse, OrdersService } from '../../core/services/orders.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderPaymentInfo } from '../../shared/components/order-payment-info/order-payment-info';
import { orderStatusLabel } from '../../shared/utils/order-status';

@Component({
  standalone: true,
  selector: 'app-checkout-success-page',
  imports: [RouterLink, DecimalPipe, OrderPaymentInfo],
  templateUrl: './checkout-success-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSuccessPage {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly notificationService = inject(NotificationService);

  readonly orderId = Number(this.route.snapshot.paramMap.get('orderId') ?? '0');
  readonly loading = signal(true);
  readonly order = signal<OrderResponse | null>(null);
  readonly statusLabel = computed(() => orderStatusLabel(this.order()?.status));

  constructor() {
    this.loadOrder();
  }

  private async loadOrder() {
    if (!this.orderId) {
      this.loading.set(false);
      this.notificationService.error('No encontramos el pedido.');
      return;
    }

    try {
      const order = await firstValueFrom(this.ordersService.getOrderById(this.orderId));
      this.order.set(order);
    } catch {
      this.notificationService.error('No pudimos cargar el detalle del pedido.');
    } finally {
      this.loading.set(false);
    }
  }
}
