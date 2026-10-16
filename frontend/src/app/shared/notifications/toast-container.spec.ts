import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationService } from '../../core/services/notification.service';
import { ToastContainer } from './toast-container';

describe('ToastContainer', () => {
  let fixture: ComponentFixture<ToastContainer>;
  let notifications: NotificationService;

  const el = () => fixture.nativeElement as HTMLElement;
  const alerts = () => Array.from(el().querySelectorAll('.alert'));

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({
      imports: [ToastContainer],
      providers: [provideZonelessChangeDetection()],
    });
    notifications = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();
  });

  afterEach(() => jasmine.clock().uninstall());

  it('REQ-2.2: al notificar un éxito muestra el mensaje con la clase alert-success', () => {
    notifications.success('Guardado');
    fixture.detectChanges();

    expect(alerts().length).toBe(1);
    expect(alerts()[0].textContent).toContain('Guardado');
    expect(alerts()[0].classList).toContain('alert-success');
  });

  it('REQ-2.2: muestra una notificación por cada tipo con su clase', () => {
    notifications.success('a');
    notifications.error('b');
    notifications.info('c');
    fixture.detectChanges();

    expect(alerts().map((a) => a.className.includes('alert-success') ? 'success' : a.className.includes('alert-error') ? 'error' : 'info')).toEqual([
      'success',
      'error',
      'info',
    ]);
  });

  it('REQ-2.2: la notificación desaparece de la pantalla al vencer su tiempo', () => {
    notifications.error('Falló');
    fixture.detectChanges();
    expect(alerts().length).toBe(1);

    jasmine.clock().tick(1000);
    fixture.detectChanges();

    expect(alerts().length).toBe(0);
  });
});
