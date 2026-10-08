import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { MailService } from './mail.service';

type SentMail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
};

const sendMock = jest.fn();
const sent = (): SentMail => (sendMock.mock.calls as Array<[SentMail]>)[0][0];

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('MailService.sendContactMessage', () => {
  let service: MailService;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    const config = {
      get: (key: string) => ({ RESEND_API_KEY: 'test-key', MAIL_FROM: 'Portfolio <no-reply@test.dev>' })[key],
    } as unknown as ConfigService;
    service = new MailService(config);
  });

  const input = {
    to: 'yo@test.dev',
    name: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    message: 'Hola, me gustaría hablar.',
  };

  it('usa MAIL_FROM como remitente, el destinatario configurado y el email del visitante como reply-to', async () => {
    await service.sendContactMessage(input);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sent();
    expect(payload.from).toBe('Portfolio <no-reply@test.dev>');
    expect(payload.to).toBe('yo@test.dev');
    expect(payload.replyTo).toBe('ana@ejemplo.com');
  });

  it('incluye nombre, email y mensaje en el cuerpo', async () => {
    await service.sendContactMessage(input);

    const { html, text } = sent();
    for (const body of [html, text]) {
      expect(body).toContain('Ana Pérez');
      expect(body).toContain('ana@ejemplo.com');
      expect(body).toContain('Hola, me gustaría hablar.');
    }
  });

  it('arma el asunto con prefijo fijo y sin saltos de línea', async () => {
    await service.sendContactMessage({ ...input, name: 'Ana\r\nBcc: x@y.com\n  Pérez' });

    const { subject } = sent();
    expect(subject).toBe('Contacto portfolio: Ana Bcc: x@y.com Pérez');
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('escapa el HTML del nombre y del mensaje', async () => {
    await service.sendContactMessage({
      ...input,
      name: '<b>Ana</b>',
      message: '<script>alert("x")</script>\nsegunda línea & más',
    });

    const { html } = sent();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Ana</b>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('<br>segunda línea &amp; más');
  });

  it('lanza si Resend devuelve un error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'x' } });

    await expect(service.sendContactMessage(input)).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
