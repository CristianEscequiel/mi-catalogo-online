import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { allowedNext } from './order-status.machine';

export interface OrderItemResponse {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  total: number;
  createdAt: Date;
  items: OrderItemResponse[];
  allowedTransitions: OrderStatus[];
}

export interface OrderSummaryResponse {
  id: number;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  allowedTransitions: OrderStatus[];
}

// Único lugar donde se arma la respuesta de una orden (antes estaba copiado tres veces).
export const toOrderResponse = (order: Order, items: OrderItem[] = order.items): OrderResponse => ({
  id: order.id,
  status: order.status,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  customerAddress: order.shippingAddress,
  total: order.total,
  createdAt: order.createdAt,
  items: items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
  })),
  allowedTransitions: [...allowedNext(order.status)],
});

export const toOrderSummary = (order: Order): OrderSummaryResponse => ({
  id: order.id,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  total: order.total,
  status: order.status,
  createdAt: order.createdAt,
  allowedTransitions: [...allowedNext(order.status)],
});

// Resumen de "mis pedidos": solo datos de la orden, sin datos personales ni transiciones.
export interface MyOrderSummaryResponse {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  itemCount: number;
}

export interface MyOrdersPage {
  items: MyOrderSummaryResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const toMyOrderSummary = (order: Order, itemCount: number): MyOrderSummaryResponse => ({
  id: order.id,
  status: order.status,
  total: order.total,
  createdAt: order.createdAt,
  itemCount,
});
