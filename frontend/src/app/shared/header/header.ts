import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthStore } from '../../core/state/auth.store';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { AuthFacade } from '../../features/auth/services/auth.facade';
import { CartStore } from '../../core/state/cart.store';
import { DecimalPipe } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { resolveImageUrl } from '../../core/config/api.config';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [RouterLink, FontAwesomeModule, DecimalPipe],
  templateUrl: './header2.html'
})

export class Header implements OnInit {
  faRightFromBracket = faRightFromBracket
  private store = inject(AuthStore);
  private authFacade = inject(AuthFacade)
  isLoggedIn = this.store.isLoggedIn;
  userName = computed(() => (this.store.userProfile()?.name ?? ''));
  userLastName = computed(() => (this.store.userProfile()?.lastName ?? ''));
  avatar = computed(() => (this.store.userProfile() as any)?.avatar ?? null);

  readonly cartStore = inject(CartStore);
  private readonly themeService = inject(ThemeService);

  readonly items = this.cartStore.items;
  readonly total = this.cartStore.total;
  readonly totalItems = this.cartStore.totalItems;
  readonly isDarkTheme = this.themeService.isDarkTheme;

  ngOnInit(): void {
    this.cartStore.loadCart().catch((error: unknown) => console.error(error));
  }
  resolvedImageUrl(imageUrl: string | null): string | null {
    return resolveImageUrl(imageUrl);
  }

  async removeItem(productId: number): Promise<void> {
    try {
      await this.cartStore.remove(productId);
    } catch (error) {
      console.error(error);
    }
  }

  async clearCart(): Promise<void> {
    try {
      await this.cartStore.clear();
    } catch (error) {
      console.error(error);
    }
  }

  onThemeToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.themeService.setTheme(input.checked ? 'meadowdark' : 'meadowlight');
  }

  logOut() {
    this.authFacade.logout();
  }

}
