import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { CONTACT_FAILURE_MESSAGE, CONTACT_SEND_TIMEOUT_MS, CONTACT_SUCCESS_MESSAGE, ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

const dto = (overrides: Partial<CreateContactDto> = {}): CreateContactDto =>
  Object.assign(new CreateContactDto(), {
    name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    message: 'Texto privado del visitante',
    ...overrides,
  });

const configWith = (value: string | undefined) => ({ get: jest.fn().mockReturnValue(value) }) as unknown as ConfigService;

describe('ContactService', () => {
  let sendContactMessage: jest.Mock;
  let mail: MailService;
  let service: ContactService;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    sendContactMessage = jest.fn().mockResolvedValue(undefined);
    mail = { sendContactMessage } as unknown as MailService;
    service = new ContactService(configWith('yo@test.dev'), mail);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('configuración', () => {
    it.each([
      ['ausente', undefined],
      ['vacío', ''],
      ['inválido', 'no-es-un-email'],
    ])('falla al construirse si CONTACT_TO_EMAIL está %s, nombrando la variable', (_l, value) => {
      expect(() => new ContactService(configWith(value), mail)).toThrow(/CONTACT_TO_EMAIL/);
    });
  });

  describe('envío correcto', () => {
    it('envía al destinatario configurado con los datos del visitante', async () => {
      const result = await service.submit(dto());

      expect(sendContactMessage).toHaveBeenCalledWith({
        to: 'yo@test.dev',
        name: 'Ana Pérez',
        email: 'ana@ejemplo.com',
        message: 'Texto privado del visitante',
      });
      expect(result).toEqual({ message: CONTACT_SUCCESS_MESSAGE });
    });
  });

  describe('honeypot', () => {
    it.each([['http://spam.example'], ['x'], [123]])('con website=%p responde igual que un envío real y no llama al mail', async (website) => {
      const result = await service.submit(dto({ website }));

      expect(result).toEqual({ message: CONTACT_SUCCESS_MESSAGE });
      expect(sendContactMessage).not.toHaveBeenCalled();
    });

    it('registra un aviso sin el contenido del mensaje', async () => {
      await service.submit(dto({ website: 'spam' }));

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('Texto privado del visitante');
    });

    it('un website vacío se trata como un envío normal', async () => {
      await service.submit(dto({ website: '' }));
      expect(sendContactMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('falla de Resend', () => {
    const expect503 = async (promise: Promise<unknown>) => {
      const error = await promise.then(
        () => undefined,
        (e: unknown) => e,
      );
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const body = (error as ServiceUnavailableException).getResponse() as { message: string };
      expect(body.message).toBe(CONTACT_FAILURE_MESSAGE);
      return error as ServiceUnavailableException;
    };

    it('responde 503 genérico si el mail lanza un error de Resend', async () => {
      sendContactMessage.mockRejectedValue(new Error('resend: invalid api key re_SECRET123'));

      const error = await expect503(service.submit(dto()));

      expect(JSON.stringify(error.getResponse())).not.toMatch(/SECRET|resend/i);
    });

    it('responde 503 genérico si el mail lanza una excepción que no es Error', async () => {
      sendContactMessage.mockRejectedValue('boom');
      await expect503(service.submit(dto()));
    });

    it('responde 503 si el envío supera el tiempo máximo', async () => {
      jest.useFakeTimers();
      sendContactMessage.mockReturnValue(new Promise(() => undefined));

      const pending = expect503(service.submit(dto()));
      await jest.advanceTimersByTimeAsync(CONTACT_SEND_TIMEOUT_MS + 1);

      await pending;
    });

    it('no corta antes del tiempo máximo', async () => {
      jest.useFakeTimers();
      let resolveSend: () => void = () => undefined;
      sendContactMessage.mockReturnValue(new Promise<void>((r) => (resolveSend = r)));

      const pending = service.submit(dto());
      await jest.advanceTimersByTimeAsync(CONTACT_SEND_TIMEOUT_MS - 1);
      resolveSend();

      await expect(pending).resolves.toEqual({ message: CONTACT_SUCCESS_MESSAGE });
    });

    it('registra el error sin incluir el mensaje del visitante', async () => {
      sendContactMessage.mockRejectedValue(new Error('fallo de red'));

      await expect503(service.submit(dto()));

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('Texto privado del visitante');
    });
  });
});
