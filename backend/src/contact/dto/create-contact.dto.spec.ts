import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateContactDto } from './create-contact.dto';

// Mismas opciones que el ValidationPipe global de main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const valid = {
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  message: 'Hola, me gustaría hablar de un proyecto.',
};

const run = async (body: Record<string, unknown>): Promise<CreateContactDto> => (await pipe.transform(body, { type: 'body', metatype: CreateContactDto })) as CreateContactDto;

const errorsOf = async (body: Record<string, unknown>): Promise<string[]> => {
  try {
    await run(body);
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
  throw new Error('Se esperaba un 400');
};

describe('CreateContactDto', () => {
  it('acepta un cuerpo válido y devuelve una instancia del DTO', async () => {
    const dto = await run(valid);
    expect(dto).toBeInstanceOf(CreateContactDto);
    expect(dto).toMatchObject(valid);
  });

  describe('name', () => {
    it.each([
      ['ausente', undefined],
      ['vacío', ''],
      ['solo espacios', '   '],
      ['de 1 carácter tras recortar', '  a '],
      ['de 81 caracteres', 'a'.repeat(81)],
    ])('rechaza un nombre %s', async (_label, name) => {
      const errors = await errorsOf({ ...valid, name });
      expect(errors.some((m) => m.startsWith('name:'))).toBe(true);
    });

    it('acepta 2 y 80 caracteres y recorta los espacios', async () => {
      expect((await run({ ...valid, name: 'Al' })).name).toBe('Al');
      expect((await run({ ...valid, name: 'a'.repeat(80) })).name).toHaveLength(80);
      expect((await run({ ...valid, name: '  Ana  ' })).name).toBe('Ana');
    });
  });

  describe('email', () => {
    it.each([
      ['ausente', undefined],
      ['sin formato', 'no-es-un-email'],
      ['de 255 caracteres', `${'a'.repeat(243)}@ejemplo.com`],
    ])('rechaza un email %s', async (_label, email) => {
      const errors = await errorsOf({ ...valid, email });
      expect(errors.some((m) => m.startsWith('email:'))).toBe(true);
    });

    it('acepta un email válido de hasta 254 caracteres', async () => {
      const local = 'a'.repeat(64);
      const email = `${local}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
      expect(email.length).toBeLessThanOrEqual(254);
      expect((await run({ ...valid, email })).email).toBe(email);
    });
  });

  describe('message', () => {
    it.each([
      ['ausente', undefined],
      ['vacío', ''],
      ['de 9 caracteres', '123456789'],
      ['de 2001 caracteres', 'a'.repeat(2001)],
    ])('rechaza un mensaje %s', async (_label, message) => {
      const errors = await errorsOf({ ...valid, message });
      expect(errors.some((m) => m.startsWith('message:'))).toBe(true);
    });

    it('acepta 10 y 2000 caracteres', async () => {
      expect((await run({ ...valid, message: '1234567890' })).message).toHaveLength(10);
      expect((await run({ ...valid, message: 'a'.repeat(2000) })).message).toHaveLength(2000);
    });
  });

  it('rechaza campos no declarados', async () => {
    const errors = await errorsOf({ ...valid, role: 'ADMIN' });
    expect(errors.join(' ')).toContain('role');
  });

  it('acepta cualquier valor en el honeypot', async () => {
    expect((await run({ ...valid, website: '' })).website).toBe('');
    expect((await run({ ...valid, website: 'http://spam.example' })).website).toBe('http://spam.example');
    expect((await run({ ...valid, website: 123 })).website).toBeDefined();
  });

  it('todos los mensajes de error de campos conocidos empiezan con "campo: "', async () => {
    const errors = await errorsOf({ name: '', email: 'x', message: '' });
    expect(errors.length).toBeGreaterThan(0);
    for (const message of errors) {
      expect(message).toMatch(/^(name|email|message): .+/);
    }
  });
});
