import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../product/entities/product.entity';
import { Status } from '../product/models/status.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order-status.enum';
import { Role } from '../auth/roles/roles.enum';
import { lineTotal, sumMoney } from '../common/money';
import { MyOrdersPage, OrderResponse, toMyOrderSummary, toOrderResponse, toOrderSummary } from './order.mapper';
import type { ListMyOrdersQueryDto } from './dto/list-my-orders-query.dto';
import { allowedNext, canTransition } from './order-status.machine';

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto): Promise<OrderResponse> {
    return this.dataSource.transaction(async (manager) => {
      // Carrito sin relaciones y ordenado: Postgres no permite FOR UPDATE sobre un outer join, y
      // bloquear siempre en orden ascendente de id evita deadlocks entre checkouts simultáneos.
      const cartItems = await manager.find(CartItem, { where: { userId }, order: { productId: 'ASC' } });

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const products = await manager.find(Product, {
        where: { id: In(cartItems.map((item) => item.productId)) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      // Se valida todo ANTES de escribir: si algo falla no se tocó ningún stock.
      for (const cartItem of cartItems) {
        const product = productsById.get(cartItem.productId);
        if (!product) {
          throw new BadRequestException(`Product ${cartItem.productId} is no longer available`);
        }
        if (product.status !== Status.PUBLISHED) {
          throw new BadRequestException(`Product ${product.name} is not available`);
        }
        if (!product.price || product.price <= 0) {
          throw new BadRequestException(`Product ${product.name} has no valid price`);
        }
        if (cartItem.quantity > (product.stock ?? 0)) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }
      }

      const lines = cartItems.map((cartItem) => {
        const product = productsById.get(cartItem.productId) as Product;
        return { cartItem, product, subtotal: lineTotal(product.price, cartItem.quantity) };
      });

      const savedOrder = await manager.save(
        manager.create(Order, {
          userId,
          customerName: createOrderDto.name,
          customerEmail: createOrderDto.email,
          shippingAddress: createOrderDto.address,
          total: sumMoney(lines.map((line) => line.subtotal)),
          status: OrderStatus.PENDING_PAYMENT,
        }),
      );

      const orderItems = await manager.save(
        lines.map((line) =>
          manager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: line.product.id,
            productName: line.product.name,
            quantity: line.cartItem.quantity,
            unitPrice: line.product.price,
            subtotal: line.subtotal,
          }),
        ),
      );

      for (const { cartItem, product } of lines) {
        await manager.update(Product, product.id, { stock: (product.stock ?? 0) - cartItem.quantity });
      }

      await manager.delete(CartItem, { userId });

      return toOrderResponse(savedOrder, orderItems);
    });
  }

  async getOrderById(orderId: number, userId: number) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId, userId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    return toOrderResponse(order);
  }

  // Historial paginado del usuario. Dos consultas: las órdenes de la página (sin join, para que
  // skip/take paginen órdenes) y un conteo agrupado de líneas. `::int` evita que pg devuelva bigint como string.
  async getMyOrders(userId: number, query: Pick<ListMyOrdersQueryDto, 'page' | 'limit'>): Promise<MyOrdersPage> {
    const { page, limit } = query;
    const [orders, total] = await this.dataSource.getRepository(Order).findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const counts = new Map<number, number>();
    if (orders.length > 0) {
      const placeholders = orders.map((_, index) => `$${index + 1}`).join(', ');
      const rows: unknown = await this.dataSource.query(
        `SELECT "order_id", COUNT(*)::int AS "count" FROM "order_items" WHERE "order_id" IN (${placeholders}) GROUP BY "order_id"`,
        orders.map((order) => order.id),
      );
      for (const row of rows as Array<{ order_id: number; count: number | string }>) {
        counts.set(Number(row.order_id), Number(row.count));
      }
    }

    return {
      items: orders.map((order) => toMyOrderSummary(order, counts.get(order.id) ?? 0)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllOrders() {
    const orders = await this.dataSource.getRepository(Order).find({
      order: { createdAt: 'DESC' },
    });

    return orders.map(toOrderSummary);
  }

  async getOrderByIdForRole(orderId: number, userId: number, role: Role) {
    if (role !== Role.ADMIN) {
      return this.getOrderById(orderId, userId);
    }

    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    return toOrderResponse(order);
  }

  async updateStatus(orderId: number, status: OrderStatus) {
    const order = await this.dataSource.transaction((manager) => this.transition(manager, orderId, status));

    return {
      id: order.id,
      status: order.status,
      allowedTransitions: [...allowedNext(order.status)],
    };
  }

  // Ids de órdenes PENDING_PAYMENT que superan el plazo de pago. Usa NOW() de la base (la misma
  // expresión que el DEFAULT de created_at) para no depender de la zona horaria de Node.
  async findStaleOrderIds(ttlHours: number, limit: number): Promise<number[]> {
    const found: unknown = await this.dataSource.query(`SELECT "id" FROM "orders" WHERE "status" = $1 AND "created_at" < NOW() - ($2 * INTERVAL '1 hour') ORDER BY "id" LIMIT $3`, [OrderStatus.PENDING_PAYMENT, ttlHours, limit]);
    return (found as Array<{ id: number }>).map((row) => row.id);
  }

  // Cancela la orden solo si SIGUE pendiente y vencida; devuelve si la canceló. La revalidación bajo lock
  // evita devolver el stock dos veces si el admin la tocó o si otra ejecución llegó primero.
  async expireIfStale(orderId: number, ttlHours: number): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId }, lock: { mode: 'pessimistic_write' } });
      if (!order || order.status !== OrderStatus.PENDING_PAYMENT) {
        return false;
      }

      const stale: unknown = await manager.query(`SELECT 1 FROM "orders" WHERE "id" = $1 AND "created_at" < NOW() - ($2 * INTERVAL '1 hour')`, [orderId, ttlHours]);
      if ((stale as unknown[]).length === 0) {
        return false;
      }

      await this.transition(manager, orderId, OrderStatus.CANCELLED);
      return true;
    });
  }

  // Cambio de estado transaccional. Lo usan el admin y, más adelante, el vencimiento automático.
  // Se bloquea la fila de la orden: una segunda solicitud simultánea espera, ve el estado nuevo y recibe 409.
  private async transition(manager: EntityManager, orderId: number, target: OrderStatus): Promise<Order> {
    const order = await manager.findOne(Order, { where: { id: orderId }, lock: { mode: 'pessimistic_write' } });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    if (!canTransition(order.status, target)) {
      throw new ConflictException(`Cannot change order from ${order.status} to ${target}`);
    }

    if (target === OrderStatus.CANCELLED) {
      await this.restock(manager, order.id);
    }

    order.status = target;
    return manager.save(order);
  }

  // Devuelve al stock lo que descontó el checkout. Bloquea los productos en orden ascendente de id
  // (igual que createOrder) para no provocar deadlocks. COALESCE: products.stock admite NULL.
  private async restock(manager: EntityManager, orderId: number): Promise<void> {
    const items = await manager.find(OrderItem, { where: { orderId }, order: { productId: 'ASC' } });

    if (items.length === 0) {
      return;
    }

    await manager.find(Product, {
      where: { id: In(items.map((item) => item.productId)) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });

    for (const item of items) {
      await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'COALESCE("stock", 0) + :quantity' })
        .setParameter('quantity', item.quantity)
        .where('id = :productId', { productId: item.productId })
        .execute();
    }
  }
}
