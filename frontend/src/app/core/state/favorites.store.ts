import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';
import { FavoritesService } from '../services/favorites.service';

@Injectable({ providedIn: 'root' })
export class FavoritesStore {
  private readonly favoritesService = inject(FavoritesService);
  private readonly authStore = inject(AuthStore);

  private readonly _favoriteIds = signal<number[]>([]);

  readonly favoriteIds = this._favoriteIds.asReadonly();
  readonly totalFavorites = computed(() => this._favoriteIds().length);

  isFavorite(productId: number): boolean {
    return this._favoriteIds().includes(productId);
  }

  async loadFavorites() {
    if (!this.authStore.isLoggedIn()) {
      this._favoriteIds.set([]);
      return;
    }

    const favorites = await firstValueFrom(this.favoritesService.getFavorites());
    this._favoriteIds.set(favorites.map((favorite) => favorite.id));
  }

  async toggleFavorite(productId: number) {
    if (!this.authStore.isLoggedIn()) {
      return;
    }

    if (this.isFavorite(productId)) {
      await firstValueFrom(this.favoritesService.removeFavorite(productId));
      this._favoriteIds.update((ids) => ids.filter((id) => id !== productId));
      return;
    }

    await firstValueFrom(this.favoritesService.addFavorite(productId));
    this._favoriteIds.update((ids) => [...ids, productId]);
  }
}
