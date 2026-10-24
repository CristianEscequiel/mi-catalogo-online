import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BANK_TRANSFER_DATA } from '../../../core/config/bank-transfer.config';
import { OrderResponse } from '../../../core/services/orders.service';
import { buildWhatsappUrl } from '../../utils/order-whatsapp';

@Component({
  standalone: true,
  selector: 'app-order-payment-info',
  templateUrl: './order-payment-info.html',
  host: { class: 'flex w-full flex-col items-start gap-4' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPaymentInfo {
  readonly order = input.required<OrderResponse>();
  readonly bankData = BANK_TRANSFER_DATA;
  readonly whatsappUrl = computed(() =>
    buildWhatsappUrl(this.order(), this.bankData.whatsappNumber),
  );
}
