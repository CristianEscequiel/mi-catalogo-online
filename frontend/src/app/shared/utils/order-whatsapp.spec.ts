import { OrderResponse } from '../../core/services/orders.service';
import { buildWhatsappUrl } from './order-whatsapp';

const order: OrderResponse = {
  id: 12,
  status: 'PENDING_PAYMENT',
  customerName: 'Ana Gómez',
  customerEmail: 'ana@example.com',
  customerAddress: 'Calle 123, Ciudad',
  total: 450,
  createdAt: '2026-10-16T10:00:00Z',
  items: [
    { productId: 1, productName: 'Remera lisa', unitPrice: 100, quantity: 3, subtotal: 300 },
    { productId: 2, productName: 'Gorra', unitPrice: 150, quantity: 1, subtotal: 150 },
  ],
  allowedTransitions: ['PAID', 'CANCELLED'],
};

describe('buildWhatsappUrl', () => {
  it('NFR-3: coincide byte a byte con el mensaje que arma hoy la pantalla de éxito del checkout', () => {
    // Mensaje de referencia copiado del comportamiento actual de CheckoutSuccessPage.
    const message = [
      'Hola, realicé el pedido #12:',
      '',
      '- Remera lisa x3 - $300',
      '- Gorra x1 - $150',
      '',
      'Cliente: Ana Gómez',
      'Total: $450',
      '',
      'Voy a enviar el comprobante de transferencia.',
    ].join('\n');

    expect(buildWhatsappUrl(order, '541144495944')).toBe(`https://wa.me/541144495944?text=${encodeURIComponent(message)}`);
  });
});
