import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { OrdersService } from '../../core/services/orders.service';
import { AuthStore } from '../../core/state/auth.store';
import { CartStore } from '../../core/state/cart.store';

interface CheckoutForm {
  name: FormControl<string>;
  email: FormControl<string>;
  address: FormControl<string>;
}

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './checkout-page.html',
})
export class CheckoutPage implements OnInit {
  private readonly cartStore = inject(CartStore);
  private readonly authStore = inject(AuthStore);
  private readonly ordersService = inject(OrdersService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly items = this.cartStore.items;
  readonly total = this.cartStore.total;
  readonly loading = signal(false);
  readonly hasItems = computed(() => this.items().length > 0);

  readonly checkoutForm = new FormGroup<CheckoutForm>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    address: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.cartStore.loadCart().catch((error: unknown) => console.error(error));

    const profile = this.authStore.userProfile();
    const userLite = this.authStore.userLite();

    this.checkoutForm.patchValue({
      name: `${profile?.name ?? ''} ${profile?.lastName ?? ''}`.trim(),
      email: userLite?.email ?? '',
    });
  }

  async placeOrder(): Promise<void> {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    if (!this.hasItems()) {
      this.notificationService.info('Tu carrito está vacío.');
      return;
    }

    try {
      this.loading.set(true);
      const payload = this.checkoutForm.getRawValue();
      const response = await firstValueFrom(this.ordersService.placeOrder(payload));

      await this.cartStore.loadCart();
      this.notificationService.success(`Orden #${response.id} creada correctamente.`);
      await this.router.navigate(['/checkout/success', response.id]);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const backendMessage = error.error?.message;
        if (typeof backendMessage === 'string' && backendMessage.trim()) {
          this.notificationService.error(backendMessage);
          return;
        }
      }

      this.notificationService.error('No se pudo procesar la orden. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
