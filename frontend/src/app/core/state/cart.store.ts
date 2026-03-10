import { signal, computed, Injectable } from '@angular/core';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([]);

  readonly items = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((acc, i) => acc + i.price * i.qty, 0)
  );

  readonly totalItems = computed(() =>
  this._items().reduce((acc, i) => acc + i.qty, 0)
);

  add(item: CartItem) {
    this._items.update(items => {
      const found = items.find(i => i.productId === item.productId);

      if (found) {
        return items.map(i =>
          i.productId === item.productId
            ? { ...i, qty: i.qty + item.qty }
            : i
        );
      }

      return [...items, item];
    });
  }

  remove(productId: number) {
    this._items.update(items =>
      items.filter(i => i.productId !== productId)
    );
  }

  clear() {
    this._items.set([]);
  }
}
