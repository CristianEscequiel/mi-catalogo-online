import { ORDER_STATUS_LABEL, orderStatusLabel } from './order-status';

describe('order-status (etiquetas de estado compartidas)', () => {
  it('NFR-3: ORDER_STATUS_LABEL define las cuatro etiquetas exactas', () => {
    expect(ORDER_STATUS_LABEL).toEqual({
      PENDING_PAYMENT: 'Esperando transferencia',
      PAID: 'Pagado',
      CANCELLED: 'Cancelado',
      DELIVERED: 'Entregado',
    });
  });

  it('NFR-3: orderStatusLabel devuelve la etiqueta de cada estado', () => {
    expect(orderStatusLabel('PENDING_PAYMENT')).toBe('Esperando transferencia');
    expect(orderStatusLabel('PAID')).toBe('Pagado');
    expect(orderStatusLabel('CANCELLED')).toBe('Cancelado');
    expect(orderStatusLabel('DELIVERED')).toBe('Entregado');
  });

  it('NFR-3: orderStatusLabel devuelve "Sin estado" para un valor desconocido o ausente', () => {
    expect(orderStatusLabel('OTRO')).toBe('Sin estado');
    expect(orderStatusLabel(undefined)).toBe('Sin estado');
    expect(orderStatusLabel(null)).toBe('Sin estado');
  });
});
