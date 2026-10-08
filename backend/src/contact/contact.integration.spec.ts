import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthModule } from '../health/health.module';
import { MailService } from '../mail/mail.service';
import { ContactModule } from './contact.module';

// Replica la configuración de main.ts (pipe global, trust proxy y CORS) porque main.ts no es importable.
const ALLOWED_ORIGINS = ['https://catalog.esceweb.com', 'https://esceweb.com', 'https://www.esceweb.com'];

const body = {
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  message: 'Hola, me gustaría hablar de un proyecto.',
};

const messages = (res: { body: unknown }) => (res.body as { message: string[] }).message;

describe('POST /contact (integración)', () => {
  let app: NestExpressApplication;
  const server = () => app.getHttpServer();
  let sendContactMessage: jest.Mock;

  beforeEach(async () => {
    sendContactMessage = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ CONTACT_TO_EMAIL: 'yo@test.dev' })],
        }),
        ContactModule,
        HealthModule,
      ],
    })
      .overrideProvider(MailService)
      .useValue({ sendContactMessage })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.enableCors({ origin: ALLOWED_ORIGINS });
    app.set('trust proxy', 1);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (ip: string, payload: object = body) => request(server()).post('/contact').set('X-Forwarded-For', ip).send(payload);

  describe('límite de frecuencia', () => {
    it('acepta 3 solicitudes y responde 429 con Retry-After a la cuarta, sin enviar mail', async () => {
      for (let i = 0; i < 3; i++) {
        const ok = await post('1.1.1.1');
        expect(ok.status).toBe(201);
        expect(ok.body).toEqual({ message: 'Mensaje enviado correctamente.' });
      }
      expect(sendContactMessage).toHaveBeenCalledTimes(3);

      const blocked = await post('1.1.1.1');

      expect(blocked.status).toBe(429);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
      expect((blocked.body as { message: string }).message).toContain('Demasiados intentos');
      expect(sendContactMessage).toHaveBeenCalledTimes(3);
    });

    it('cuenta por IP: otra IP no queda bloqueada', async () => {
      for (let i = 0; i < 4; i++) await post('1.1.1.1');

      const other = await post('2.2.2.2');

      expect(other.status).toBe(201);
    });

    it('toma la IP que agregó el proxy: una IP inventada al inicio de X-Forwarded-For no evita el límite', async () => {
      for (let i = 0; i < 3; i++) {
        await post(`10.0.0.${i}, 1.1.1.1`);
      }

      const blocked = await post('99.99.99.99, 1.1.1.1');

      expect(blocked.status).toBe(429);
    });

    it('no limita otros endpoints', async () => {
      for (let i = 0; i < 6; i++) {
        const res = await request(server()).get('/health').set('X-Forwarded-For', '1.1.1.1');
        expect(res.status).toBe(200);
      }
    });
  });

  describe('validación y honeypot', () => {
    it('responde 400 con mensajes "campo: texto" y no envía mail', async () => {
      const res = await post('3.3.3.3', { name: '', email: 'x', message: 'corto' });

      expect(res.status).toBe(400);
      expect(messages(res).length).toBeGreaterThan(0);
      for (const m of messages(res)) {
        expect(m).toMatch(/^(name|email|message): /);
      }
      expect(sendContactMessage).not.toHaveBeenCalled();
    });

    it('responde 400 ante campos no declarados', async () => {
      const res = await post('3.3.3.3', { ...body, role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(sendContactMessage).not.toHaveBeenCalled();
    });

    it('con honeypot lleno responde 201 igual que un envío real y no envía mail', async () => {
      const real = await post('4.4.4.4');
      sendContactMessage.mockClear();

      const bot = await post('5.5.5.5', { ...body, website: 'http://spam.example' });

      expect(bot.status).toBe(201);
      expect(bot.body).toEqual(real.body);
      expect(sendContactMessage).not.toHaveBeenCalled();
    });
  });

  describe('falla del proveedor de mail', () => {
    it('responde 503 genérico sin exponer el error original', async () => {
      sendContactMessage.mockRejectedValue(new Error('resend: invalid api key re_SECRET'));

      const res = await post('6.6.6.6');

      expect(res.status).toBe(503);
      expect(JSON.stringify(res.body)).not.toMatch(/SECRET|resend/i);
      expect((res.body as { message: string }).message).toBe('No pudimos enviar tu mensaje. Intentá de nuevo más tarde.');
    });
  });

  describe('CORS', () => {
    const preflight = (origin: string) => request(server()).options('/contact').set('Origin', origin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type');

    it.each(ALLOWED_ORIGINS)('permite el origen %s', async (origin) => {
      const res = await preflight(origin);

      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it('no devuelve Access-Control-Allow-Origin para un origen no listado', async () => {
      const res = await preflight('https://malo.example');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('la respuesta real del POST también incluye el origen permitido', async () => {
      const res = await post('7.7.7.7').set('Origin', 'https://esceweb.com');

      expect(res.status).toBe(201);
      expect(res.headers['access-control-allow-origin']).toBe('https://esceweb.com');
    });
  });
});
