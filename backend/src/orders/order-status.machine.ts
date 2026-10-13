import { OrderStatus } from './entities/order-status.enum';

// Única fuente de verdad de las transiciones de una orden. DELIVERED y CANCELLED son finales.
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const allowedNext = (from: OrderStatus): readonly OrderStatus[] => TRANSITIONS[from];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => TRANSITIONS[from].includes(to);
