import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  readonly cartLoading = signal(true);
  readonly cartError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly hasItems = computed(() => this.items().length > 0);

  readonly checkoutForm = new FormGroup<CheckoutForm>({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    address: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  ngOnInit(): void {
    this.prefillForm();
    void this.loadCart();
  }

  async retryLoad(): Promise<void> {
    await this.loadCart();
  }

  hasFieldError(controlName: keyof CheckoutForm): boolean {
    const control = this.checkoutForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  getFieldError(controlName: keyof CheckoutForm): string | null {
    const control = this.checkoutForm.controls[controlName];

    if (!this.hasFieldError(controlName)) {
      return null;
    }

    if (control.errors?.['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors?.['email']) {
      return 'Ingresa un email valido.';
    }

    if (control.errors?.['minlength']) {
      return 'Describe una direccion mas completa.';
    }

    return 'Revisa este dato.';
  }

  async placeOrder(): Promise<void> {
    this.submitError.set(null);

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    if (!this.hasItems()) {
      this.submitError.set('Agrega productos al carrito antes de finalizar el pedido.');
      return;
    }

    this.submitting.set(true);

    try {
      const payload = this.checkoutForm.getRawValue();
      const response = await firstValueFrom(this.ordersService.placeOrder(payload));

      await this.cartStore.loadCart();
      this.notificationService.success(`Orden #${response.id} creada correctamente.`);
      await this.router.navigate(['/checkout/success', response.id]);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const backendMessage = error.error?.message;
        if (typeof backendMessage === 'string' && backendMessage.trim()) {
          this.submitError.set(backendMessage);
          this.notificationService.error(backendMessage);
          this.submitting.set(false);
          return;
        }
      }

      this.submitError.set('No se pudo procesar la orden. Intenta nuevamente.');
      this.notificationService.error('No se pudo procesar la orden. Intenta nuevamente.');
    } finally {
      this.submitting.set(false);
    }
  }

  private prefillForm(): void {
    const profile = this.authStore.userProfile();
    const userLite = this.authStore.userLite();

    this.checkoutForm.patchValue({
      name: `${profile?.name ?? ''} ${profile?.lastName ?? ''}`.trim(),
      email: userLite?.email ?? '',
    });
  }

  private async loadCart(): Promise<void> {
    this.cartLoading.set(true);
    this.cartError.set(null);

    try {
      await this.cartStore.loadCart();
    } catch (error) {
      console.error(error);
      this.cartError.set('No pudimos cargar el resumen del carrito.');
    } finally {
      this.cartLoading.set(false);
    }
  }
}
