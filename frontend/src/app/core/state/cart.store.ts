import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';
import { CartResponse, CartService } from '../services/cart.service';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock?: number;
  thumbnailUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly cartService = inject(CartService);
  private readonly authStore = inject(AuthStore);
  private readonly _items = signal<CartItem[]>([]);

  readonly items = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((acc, i) => acc + i.price * i.qty, 0)
  );

  readonly totalItems = computed(() =>
  this._items().reduce((acc, i) => acc + i.qty, 0)
);

  private mapResponse(response: CartResponse): CartItem[] {
    return response.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      qty: item.quantity,
      stock: item.stock,
      thumbnailUrl: item.thumbnailUrl,
    }));
  }

  private setFromResponse(response: CartResponse): void {
    this._items.set(this.mapResponse(response));
  }

  private setLocalQuantity(productId: number, qty: number): void {
    this._items.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, qty } : item)),
    );
  }

  async loadCart(): Promise<void> {
    if (!this.authStore.isLoggedIn()) {
      return;
    }

    const response = await firstValueFrom(this.cartService.getCart());
    this.setFromResponse(response);
  }

  async add(item: CartItem): Promise<void> {
    const existingItem = this._items().find((cartItem) => cartItem.productId === item.productId);
    const nextQty = (existingItem?.qty ?? 0) + item.qty;
    await this.updateQuantity(item.productId, nextQty, item);
  }

  async updateQuantity(productId: number, qty: number, fallbackItem?: CartItem): Promise<void> {
    if (qty < 1) {
      return;
    }

    if (!this.authStore.isLoggedIn()) {
      const existingItem = this._items().find((item) => item.productId === productId);
      if (existingItem) {
        this.setLocalQuantity(productId, qty);
        return;
      }

      if (fallbackItem) {
        this._items.update((items) => [...items, { ...fallbackItem, qty }]);
      }
      return;
    }

    const response = await firstValueFrom(this.cartService.updateCartItem(productId, qty));
    this.setFromResponse(response);
  }

  async remove(productId: number): Promise<void> {
    if (!this.authStore.isLoggedIn()) {
      this._items.update((items) => items.filter((item) => item.productId !== productId));
      return;
    }

    const response = await firstValueFrom(this.cartService.removeCartItem(productId));
    this.setFromResponse(response);
  }

  async clear(): Promise<void> {
    if (!this.authStore.isLoggedIn()) {
      this._items.set([]);
      return;
    }

    const currentItems = this._items();
    for (const item of currentItems) {
      await firstValueFrom(this.cartService.removeCartItem(item.productId));
    }

    this._items.set([]);
  }
}
