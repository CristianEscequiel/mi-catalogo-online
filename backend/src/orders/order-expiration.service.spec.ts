import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { CronTime } from 'cron';
import { DEFAULT_ORDER_PAYMENT_TTL_HOURS, ORDER_EXPIRATION_CRON, OrderExpirationService } from './order-expiration.service';
import { OrdersService } from './orders.service';

describe('OrderExpirationService', () => {
  const orders = { findStaleOrderIds: jest.fn(), expireIfStale: jest.fn() };
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  const build = (ttl?: string | number) => {
    const config = { get: jest.fn().mockReturnValue(ttl) } as unknown as ConfigService;
    return new OrderExpirationService(config, orders as unknown as OrdersService);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('plazo de pago (REQ-5.2, 5.3, 5.4)', () => {
    it('sin variable definida usa 48 horas y no advierte', () => {
      expect(build(undefined).ttlHours).toBe(48);
      expect(DEFAULT_ORDER_PAYMENT_TTL_HOURS).toBe(48);
      expect(warn).not.toHaveBeenCalled();
    });

    it.each(['0', '-1', 'abc', '', 0, -5, 'NaN', 'Infinity'])('valor inválido %p → usa 48 horas y advierte', (value) => {
      expect(build(value).ttlHours).toBe(48);
      expect(warn).toHaveBeenCalledTimes(1);
      expect((warn.mock.calls as string[][])[0][0]).toContain('ORDER_PAYMENT_TTL_HOURS');
    });

    it.each([
      ['12', 12],
      ['0.5', 0.5],
      [72, 72],
    ])('valor válido %p → %p horas, sin advertencia', (value, expected) => {
      expect(build(value).ttlHours).toBe(expected);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('programación (REQ-5.5)', () => {
    it('run() está decorado con la expresión cron exportada', () => {
      const run = Object.getOwnPropertyDescriptor(OrderExpirationService.prototype, 'run')?.value as object;
      const options = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, run) as { cronTime: string };
      expect(options.cronTime).toBe(ORDER_EXPIRATION_CRON);
    });

    it('la expresión dispara al menos una vez cada 15 minutos', () => {
      const fires = new CronTime(ORDER_EXPIRATION_CRON).sendAt(6);
      expect(fires).toHaveLength(6);
      for (let i = 1; i < fires.length; i += 1) {
        const minutes = fires[i].diff(fires[i - 1], 'minutes').minutes;
        expect(minutes).toBeGreaterThan(0);
        expect(minutes).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('run()', () => {
    it('procesa cada orden vencida con el plazo configurado y devuelve cuántas canceló', async () => {
      orders.findStaleOrderIds.mockResolvedValue([1, 2, 3]);
      orders.expireIfStale.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      expect(await build('24').run()).toBe(2);

      expect(orders.findStaleOrderIds).toHaveBeenCalledWith(24, expect.any(Number));
      expect(orders.expireIfStale.mock.calls).toEqual([
        [1, 24],
        [2, 24],
        [3, 24],
      ]);
    });

    it('si falla una orden registra su id y el mensaje (sin stack) y sigue con las demás (REQ-5.7, 5.8, NFR-3)', async () => {
      orders.findStaleOrderIds.mockResolvedValue([1, 2, 3]);
      orders.expireIfStale.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(true);

      expect(await build().run()).toBe(2);

      expect(orders.expireIfStale).toHaveBeenCalledTimes(3);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]).toEqual(['No se pudo vencer la orden 2: boom']); // un solo argumento: nada de stack
    });

    it('si falla la consulta de órdenes vencidas no propaga el error y lo registra', async () => {
      orders.findStaleOrderIds.mockRejectedValue(new Error('db caída'));

      expect(await build().run()).toBe(0);

      expect(orders.expireIfStale).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledTimes(1);
    });

    it('sin órdenes vencidas no hace nada', async () => {
      orders.findStaleOrderIds.mockResolvedValue([]);
      expect(await build().run()).toBe(0);
      expect(orders.expireIfStale).not.toHaveBeenCalled();
    });
  });
});
