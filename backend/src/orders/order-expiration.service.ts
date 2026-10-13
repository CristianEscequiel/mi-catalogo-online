import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

export const DEFAULT_ORDER_PAYMENT_TTL_HOURS = 48;
// Cada 10 minutos (el requisito pide al menos una vez cada 15).
export const ORDER_EXPIRATION_CRON = '0 */10 * * * *';
const BATCH_SIZE = 200;

// Cancela las órdenes PENDING_PAYMENT que superan el plazo de pago y devuelve su stock.
// Es idempotente (cada orden se revalida bajo lock en OrdersService.expireIfStale), así que
// es seguro aunque haya varias réplicas o se solape con una ejecución anterior.
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);
  readonly ttlHours: number;

  constructor(
    config: ConfigService,
    private readonly orders: OrdersService,
  ) {
    this.ttlHours = this.resolveTtlHours(config.get<string | number>('ORDER_PAYMENT_TTL_HOURS'));
  }

  @Cron(ORDER_EXPIRATION_CRON)
  async run(): Promise<number> {
    let ids: number[];
    try {
      ids = await this.orders.findStaleOrderIds(this.ttlHours, BATCH_SIZE);
    } catch (error) {
      this.logger.error(`No se pudieron buscar órdenes vencidas: ${this.messageOf(error)}`);
      return 0;
    }

    let cancelled = 0;
    for (const id of ids) {
      try {
        if (await this.orders.expireIfStale(id, this.ttlHours)) {
          cancelled += 1;
        }
      } catch (error) {
        // Solo el id y el mensaje: nunca el stack ni datos del cliente (NFR-3).
        this.logger.error(`No se pudo vencer la orden ${id}: ${this.messageOf(error)}`);
      }
    }

    if (cancelled > 0) {
      this.logger.log(`Órdenes vencidas canceladas: ${cancelled}`);
    }
    return cancelled;
  }

  private resolveTtlHours(raw: string | number | undefined | null): number {
    if (raw === undefined || raw === null) {
      return DEFAULT_ORDER_PAYMENT_TTL_HOURS;
    }

    const parsed = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    this.logger.warn(`ORDER_PAYMENT_TTL_HOURS inválida ("${String(raw)}"): se usa el valor por defecto de ${DEFAULT_ORDER_PAYMENT_TTL_HOURS} horas`);
    return DEFAULT_ORDER_PAYMENT_TTL_HOURS;
  }

  private messageOf(error: unknown): string {
    return error instanceof Error ? error.message : 'error desconocido';
  }
}
