import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BANK_TRANSFER_DATA } from '../../core/config/bank-transfer.config';
import { OrderResponse, OrdersService } from '../../core/services/orders.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-checkout-success-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './checkout-success-page.html',
})
export class CheckoutSuccessPage {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly notificationService = inject(NotificationService);

  readonly orderId = Number(this.route.snapshot.paramMap.get('orderId') ?? '0');
  readonly loading = signal(true);
  readonly order = signal<OrderResponse | null>(null);
  readonly bankData = BANK_TRANSFER_DATA;

  readonly statusLabel = computed(() => {
    const status = this.order()?.status;
    if (status === 'PENDING_PAYMENT') {
      return 'Esperando transferencia';
    }
    if (status === 'PAID') {
      return 'Pagado';
    }
    if (status === 'CANCELLED') {
      return 'Cancelado';
    }
    if (status === 'DELIVERED') {
      return 'Entregado';
    }
    return 'Sin estado';
  });

  readonly whatsappUrl = computed(() => {
    const order = this.order();
    if (!order) {
      return '#';
    }

    const lines = order.items.map((item) => `- ${item.productName} x${item.quantity} - $${item.subtotal}`);
    const message = [
      `Hola, realicé el pedido #${order.id}:`,
      '',
      ...lines,
      '',
      `Cliente: ${order.customerName}`,
      `Total: $${order.total}`,
      '',
      'Voy a enviar el comprobante de transferencia.',
    ].join('\n');

    return `https://wa.me/${this.bankData.whatsappNumber}?text=${encodeURIComponent(message)}`;
  });

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
