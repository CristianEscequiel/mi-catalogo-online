import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

type SentMail = { from: string; to: string; subject: string; html: string; text?: string };

const sendMock = jest.fn();
const sent = (): SentMail => (sendMock.mock.calls as Array<[SentMail]>)[0][0];

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

const configWith = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('MailService', () => {
  let service: MailService;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });
    service = new MailService(configWith({ RESEND_API_KEY: 'test-key', MAIL_FROM: 'Tienda <no-reply@test.dev>', FRONTEND_URL: 'https://tienda.test' }));
  });

  it('no arranca sin RESEND_API_KEY', () => {
    expect(() => new MailService(configWith({}))).toThrow('RESEND_API_KEY is not configured');
  });

  it('sendVerificationEmail manda al destinatario un enlace de verificación con el token', async () => {
    await service.sendVerificationEmail('ana@ejemplo.com', 'tok123');

    expect(sent()).toMatchObject({ from: 'Tienda <no-reply@test.dev>', to: 'ana@ejemplo.com', subject: 'Verifica tu cuenta' });
    expect(sent().html).toContain('https://tienda.test/auth/verify-email?token=tok123');
  });

  it('sendVerificationEmail responde 500 si el proveedor devuelve error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'rechazado' } });

    await expect(service.sendVerificationEmail('ana@ejemplo.com', 'tok123')).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('sendResetPasswordMail usa el asunto recibido y arma el enlace de reseteo', async () => {
    await service.sendResetPasswordMail('ana@ejemplo.com', 'Password Reset', 'rst456');

    expect(sent().subject).toBe('Password Reset');
    expect(sent().html).toContain('https://tienda.test/auth/reset-password?token=rst456');
  });

  it('sendResetPasswordMail responde 500 si el proveedor devuelve error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'rechazado' } });

    await expect(service.sendResetPasswordMail('ana@ejemplo.com', 'Password Reset', 'rst456')).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
