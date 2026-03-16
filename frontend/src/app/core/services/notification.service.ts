import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<AppNotification[]>([]);
  private notificationId = 0;

  readonly notifications = this._notifications.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  remove(id: number): void {
    this._notifications.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: NotificationType, message: string): void {
    const id = ++this.notificationId;
    this._notifications.update((items) => [...items, { id, type, message }]);

    setTimeout(() => {
      this.remove(id);
    }, 1000);
  }
}
