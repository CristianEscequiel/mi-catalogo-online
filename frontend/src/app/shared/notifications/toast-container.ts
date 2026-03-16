import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-toast-container',
  imports: [NgClass],
  template: `
    <div class="toast toast-top toast-end z-50">
      @for (item of notifications(); track item.id) {
      <div class="alert" [ngClass]="alertClass(item.type)">
        <span>{{ item.message }}</span>
      </div>
      }
    </div>
  `,
})
export class ToastContainer {
  private readonly notificationService = inject(NotificationService);

  readonly notifications = this.notificationService.notifications;

  alertClass(type: 'success' | 'error' | 'info'): string {
    if (type === 'success') {
      return 'alert-success';
    }

    if (type === 'error') {
      return 'alert-error';
    }

    return 'alert-info';
  }
}
