import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../core/state/auth.store';
import { RouterLink, RouterOutlet } from "@angular/router";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { AuthFacade } from '../../features/auth/services/auth.facade';
import { CartStore } from '../../core/state/cart.store';
import { DecimalPipe } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [RouterLink , FontAwesomeModule , DecimalPipe],
  templateUrl: './header2.html'
})

export class Header {
  faRightFromBracket = faRightFromBracket
  private store = inject(AuthStore);
  private authFacade = inject(AuthFacade)
  isLoggedIn = this.store.isLoggedIn;
  userName = computed(() => (this.store.userProfile()?.name ?? ''));
  userLastName = computed(() => (this.store.userProfile()?.lastName ?? ''));
  avatar = computed(() => (this.store.userProfile() as any)?.avatar ?? null);

  readonly cartStore = inject(CartStore);

  readonly items = this.cartStore.items;
  readonly total = this.cartStore.total;
  readonly totalItems = this.cartStore.totalItems;

  removeItem(productId: number): void {
    this.cartStore.remove(productId);
  }

  clearCart(): void {
    this.cartStore.clear();
  }

  logOut(){
    this.authFacade.logout();
  }

}
