import { OrderResponse } from '../../core/services/orders.service';

export function buildWhatsappUrl(order: OrderResponse, whatsappNumber: string): string {
  const lines = order.items.map(
    (item) => `- ${item.productName} x${item.quantity} - $${item.subtotal}`,
  );
  const message = [
    `Hola, realicé el pedido #${order.id}:`,
    '',
    ...lines,
    '',
    `Cliente: ${order.customerName}`,
    `Total: $${order.total}`,
    '',
    'Voy a enviar el comprobante de transferencia.',
  ].join('\n');

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
