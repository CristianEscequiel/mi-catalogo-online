import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { toOrderResponse, toOrderSummary } from './order.mapper';

const createdAt = new Date('2026-10-01T10:00:00Z');

const buildOrder = (status: OrderStatus) =>
  Object.assign(new Order(), {
    id: 7,
    userId: 3,
    customerName: 'Ana',
    customerEmail: 'ana@test.local',
    shippingAddress: 'Calle 1',
    total: 0.3,
    status,
    createdAt,
    items: [Object.assign(new OrderItem(), { id: 1, orderId: 7, productId: 9, productName: 'Lapicera', quantity: 3, unitPrice: 0.1, subtotal: 0.3 })],
  });

describe('order.mapper', () => {
  it('toOrderResponse conserva los campos actuales y suma allowedTransitions (NFR-4)', () => {
    expect(toOrderResponse(buildOrder(OrderStatus.PENDING_PAYMENT))).toEqual({
      id: 7,
      status: 'PENDING_PAYMENT',
      customerName: 'Ana',
      customerEmail: 'ana@test.local',
      customerAddress: 'Calle 1',
      total: 0.3,
      createdAt,
      items: [{ productId: 9, productName: 'Lapicera', unitPrice: 0.1, quantity: 3, subtotal: 0.3 }],
      allowedTransitions: ['PAID', 'CANCELLED'],
    });
  });

  it('no expone campos internos (userId, shippingAddress, ids de ítem)', () => {
    const response = toOrderResponse(buildOrder(OrderStatus.PAID)) as unknown as Record<string, unknown>;
    expect(response).not.toHaveProperty('userId');
    expect(response).not.toHaveProperty('shippingAddress');
    expect(Object.keys((response.items as object[])[0])).toEqual(['productId', 'productName', 'unitPrice', 'quantity', 'subtotal']);
  });

  it.each([
    [OrderStatus.PENDING_PAYMENT, ['PAID', 'CANCELLED']],
    [OrderStatus.PAID, ['DELIVERED', 'CANCELLED']],
    [OrderStatus.DELIVERED, []],
    [OrderStatus.CANCELLED, []],
  ])('allowedTransitions de %s (REQ-6.1, 6.2)', (status, expected) => {
    expect(toOrderResponse(buildOrder(status)).allowedTransitions).toEqual(expected);
    expect(toOrderSummary(buildOrder(status)).allowedTransitions).toEqual(expected);
  });

  it('toOrderSummary no incluye ítems ni dirección', () => {
    expect(Object.keys(toOrderSummary(buildOrder(OrderStatus.PAID)))).toEqual(['id', 'customerName', 'customerEmail', 'total', 'status', 'createdAt', 'allowedTransitions']);
  });

  it('allowedTransitions es una copia: mutarla no altera la máquina de estados', () => {
    const first = toOrderResponse(buildOrder(OrderStatus.PENDING_PAYMENT));
    first.allowedTransitions.push(OrderStatus.DELIVERED);
    expect(toOrderResponse(buildOrder(OrderStatus.PENDING_PAYMENT)).allowedTransitions).toEqual(['PAID', 'CANCELLED']);
  });
});
