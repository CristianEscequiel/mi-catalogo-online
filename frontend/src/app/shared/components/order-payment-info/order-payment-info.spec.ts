import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BANK_TRANSFER_DATA } from '../../../core/config/bank-transfer.config';
import { OrderResponse } from '../../../core/services/orders.service';
import { buildWhatsappUrl } from '../../utils/order-whatsapp';
import { OrderPaymentInfo } from './order-payment-info';

const order: OrderResponse = {
  id: 12,
  status: 'PENDING_PAYMENT',
  customerName: 'Ana Gómez',
  customerEmail: 'ana@example.com',
  customerAddress: 'Calle 123, Ciudad',
  total: 300,
  createdAt: '2026-10-16T10:00:00Z',
  items: [{ productId: 1, productName: 'Remera lisa', unitPrice: 100, quantity: 3, subtotal: 300 }],
  allowedTransitions: ['PAID', 'CANCELLED'],
};

describe('OrderPaymentInfo', () => {
  let fixture: ComponentFixture<OrderPaymentInfo>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [OrderPaymentInfo], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrderPaymentInfo);
    fixture.componentRef.setInput('order', order);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('REQ-4.5: muestra alias, CBU, titular y banco de BANK_TRANSFER_DATA', () => {
    const text = el().textContent ?? '';
    expect(text).toContain('Datos de transferencia');
    expect(text).toContain(BANK_TRANSFER_DATA.alias);
    expect(text).toContain(BANK_TRANSFER_DATA.cbu);
    expect(text).toContain(BANK_TRANSFER_DATA.holder);
    expect(text).toContain(BANK_TRANSFER_DATA.bank);
  });

  it('REQ-4.6: el botón de WhatsApp apunta a la URL de buildWhatsappUrl y abre en pestaña nueva', () => {
    const link = Array.from(el().querySelectorAll('a')).find((a) => (a.textContent ?? '').includes('Enviar pedido por WhatsApp'));

    expect(link).withContext('no existe el botón "Enviar pedido por WhatsApp"').toBeDefined();
    expect(link?.getAttribute('href')).toBe(buildWhatsappUrl(order, BANK_TRANSFER_DATA.whatsappNumber));
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
