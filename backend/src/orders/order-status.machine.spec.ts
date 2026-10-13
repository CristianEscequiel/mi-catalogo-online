import { OrderStatus } from './entities/order-status.enum';
import { allowedNext, canTransition } from './order-status.machine';

const { PENDING_PAYMENT, PAID, DELIVERED, CANCELLED } = OrderStatus;

const ALLOWED: Array<[OrderStatus, OrderStatus]> = [
  [PENDING_PAYMENT, PAID],
  [PENDING_PAYMENT, CANCELLED],
  [PAID, DELIVERED],
  [PAID, CANCELLED],
];

describe('order-status.machine', () => {
  const all = Object.values(OrderStatus);

  it.each(all.flatMap((from) => all.map((to) => [from, to] as const)))('%s → %s', (from, to) => {
    const expected = ALLOWED.some(([a, b]) => a === from && b === to);
    expect(canTransition(from, to)).toBe(expected);
  });

  it('cubre las 16 combinaciones y solo 4 son válidas (REQ-3.1)', () => {
    const total = all.flatMap((from) => all.map((to) => canTransition(from, to)));
    expect(total).toHaveLength(16);
    expect(total.filter(Boolean)).toHaveLength(4);
  });

  it('repetir el estado actual nunca es válido (REQ-3.2)', () => {
    for (const status of all) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it('allowedNext devuelve los destinos y lista vacía en estados finales (REQ-6.1, 6.2)', () => {
    expect(allowedNext(PENDING_PAYMENT)).toEqual([PAID, CANCELLED]);
    expect(allowedNext(PAID)).toEqual([DELIVERED, CANCELLED]);
    expect(allowedNext(DELIVERED)).toEqual([]);
    expect(allowedNext(CANCELLED)).toEqual([]);
  });
});
