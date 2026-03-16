import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-checkout-success-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './checkout-success-page.html',
})
export class CheckoutSuccessPage {
  private readonly route = inject(ActivatedRoute);

  readonly orderId = Number(this.route.snapshot.paramMap.get('orderId') ?? '0');
  readonly total = Number(this.route.snapshot.queryParamMap.get('total') ?? '0');
  readonly itemsCount = Number(this.route.snapshot.queryParamMap.get('items') ?? '0');
}
