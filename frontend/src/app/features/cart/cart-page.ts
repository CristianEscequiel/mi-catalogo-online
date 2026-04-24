import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { resolveImageUrl } from '../../core/config/api.config';
import { CartItem, CartStore } from '../../core/state/cart.store';

@Component({
  standalone: true,
  selector: 'app-cart-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './cart-page.html',
})
export class CartPage implements OnInit {
  private readonly cartStore = inject(CartStore);
  private readonly notificationService = inject(NotificationService);

  readonly items = this.cartStore.items;
  readonly total = this.cartStore.total;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly clearingCart = signal(false);
  readonly updatingIds = signal<number[]>([]);
  readonly removingIds = signal<number[]>([]);
  readonly hasItems = computed(() => this.items().length > 0);

  ngOnInit(): void {
    void this.loadCart();
  }

  async retryLoad(): Promise<void> {
    await this.loadCart();
  }

  resolveImageUrl(imagePath?: string | null): string {
    return resolveImageUrl(imagePath) ?? 'https://placehold.co/120x120?text=Producto';
  }

  isUpdating(productId: number): boolean {
    return this.updatingIds().includes(productId);
  }

  isRemoving(productId: number): boolean {
    return this.removingIds().includes(productId);
  }

  canIncrease(item: CartItem): boolean {
    return item.qty < Math.max(item.stock ?? 1, 1) && !this.isUpdating(item.productId);
  }

  canDecrease(item: CartItem): boolean {
    return item.qty > 1 && !this.isUpdating(item.productId);
  }

  async changeQuantity(item: CartItem, nextQty: number): Promise<void> {
    const maxStock = Math.max(item.stock ?? 1, 1);
    const normalizedValue = Math.max(1, Math.min(Math.floor(nextQty), maxStock));

    if (normalizedValue === item.qty || this.isUpdating(item.productId)) {
      return;
    }

    this.updatingIds.update((ids) => [...ids, item.productId]);

    try {
      await this.cartStore.updateQuantity(item.productId, normalizedValue, item);
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo actualizar la cantidad.');
    } finally {
      this.updatingIds.update((ids) => ids.filter((id) => id !== item.productId));
    }
  }

  async updateQuantityFromInput(item: CartItem, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const parsedValue = Number(input.value);

    if (!Number.isFinite(parsedValue)) {
      input.value = String(item.qty);
      return;
    }

    const maxStock = Math.max(item.stock ?? 1, 1);
    const normalizedValue = Math.max(1, Math.min(Math.floor(parsedValue), maxStock));
    input.value = String(normalizedValue);

    await this.changeQuantity(item, normalizedValue);
  }

  async removeItem(productId: number): Promise<void> {
    if (this.isRemoving(productId)) {
      return;
    }

    this.removingIds.update((ids) => [...ids, productId]);

    try {
      await this.cartStore.remove(productId);
      this.notificationService.info('Producto quitado del carrito.');
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo quitar el producto.');
    } finally {
      this.removingIds.update((ids) => ids.filter((id) => id !== productId));
    }
  }

  async clearCart(): Promise<void> {
    if (!this.hasItems() || this.clearingCart()) {
      return;
    }

    this.clearingCart.set(true);

    try {
      await this.cartStore.clear();
      this.notificationService.success('Carrito vaciado.');
    } catch (error) {
      console.error(error);
      this.notificationService.error('No se pudo vaciar el carrito.');
    } finally {
      this.clearingCart.set(false);
    }
  }

  private async loadCart(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.cartStore.loadCart();
    } catch (error) {
      console.error(error);
      this.error.set('No pudimos cargar el carrito. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
