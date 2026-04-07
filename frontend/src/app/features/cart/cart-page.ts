import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/state/cart.store';
import { resolveImageUrl } from '../../core/config/api.config';

@Component({
  standalone: true,
  selector: 'app-cart-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './cart-page.html',
})
export class CartPage implements OnInit {
  private readonly cartStore = inject(CartStore);

  readonly items = this.cartStore.items;
  readonly total = this.cartStore.total;

  ngOnInit(): void {
    this.cartStore.loadCart().catch((error: unknown) => console.error(error));
  }
  resolveImageUrl(imagePath?: string | null) {
      return resolveImageUrl(imagePath);
    }

  async updateQuantity(productId: number, event: Event, stock: number | undefined): Promise<void> {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    const maxStock = Math.max(stock ?? 1, 1);

    if (!Number.isFinite(value)) {
      input.value = '1';
      return;
    }

    const normalizedValue = Math.max(1, Math.min(Math.floor(value), maxStock));
    input.value = String(normalizedValue);

    try {
      await this.cartStore.updateQuantity(productId, normalizedValue);
    } catch (error) {
      console.error(error);
    }
  }

  async removeItem(productId: number): Promise<void> {
    try {
      await this.cartStore.remove(productId);
    } catch (error) {
      console.error(error);
    }
  }
}
