import { OrderStatus } from '../../core/services/orders.service';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Esperando transferencia',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  DELIVERED: 'Entregado',
};

export function orderStatusLabel(status: string | null | undefined): string {
  if (status && Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABEL, status)) {
    return ORDER_STATUS_LABEL[status as OrderStatus];
  }
  return 'Sin estado';
}
