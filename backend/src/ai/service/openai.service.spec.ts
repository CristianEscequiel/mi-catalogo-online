import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/env.model';
import { OpenaiService } from './openai.service';

const createMock = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ responses: { create: createMock } })),
}));

const configWith = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as unknown as ConfigService<Env>;

describe('OpenaiService', () => {
  let service: OpenaiService;
  const categories = [
    { id: 1, name: 'Teclados' },
    { id: 2, name: 'Monitores' },
  ];

  beforeEach(() => {
    createMock.mockReset();
    service = new OpenaiService(configWith({ OPENAI_API_KEY: 'sk-test' }));
  });

  it('no arranca sin OPENAI_API_KEY', () => {
    expect(() => new OpenaiService(configWith({}))).toThrow('OPENAI_API_KEY is not set');
  });

  describe('generateProductContent', () => {
    it('devuelve la descripción de la IA y un slug sin tildes ni símbolos', async () => {
      createMock.mockResolvedValue({ output_text: JSON.stringify({ description: 'Teclado mecánico' }) });

      await expect(service.generateProductContent('Teclado Mecánico RGB!')).resolves.toEqual({
        description: 'Teclado mecánico',
        slug: 'teclado-mecanico-rgb',
      });
    });

    it('falla con "Invalid AI response format" si la IA no devuelve JSON', async () => {
      createMock.mockResolvedValue({ output_text: 'esto no es json' });

      await expect(service.generateProductContent('Teclado')).rejects.toThrow('Invalid AI response format');
    });
  });

  describe('generateProductFromImage', () => {
    it('rechaza sin llamar a la IA una imagen vacía o una lista de categorías vacía', async () => {
      await expect(service.generateProductFromImage('  ', categories)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.generateProductFromImage('https://img.test/a.png', [])).rejects.toBeInstanceOf(BadRequestException);
      expect(createMock).not.toHaveBeenCalled();
    });

    it('arma el producto y resuelve la categoría ignorando mayúsculas y tildes', async () => {
      createMock.mockResolvedValue({ output_text: JSON.stringify({ name: ' Teclado Gamer ', description: ' Con luces ', categoryName: 'TECLADOS' }) });

      await expect(service.generateProductFromImage('https://img.test/a.png', categories)).resolves.toEqual({
        name: 'Teclado Gamer',
        description: 'Con luces',
        categoryId: 1,
        categoryName: 'Teclados',
        slug: 'teclado-gamer',
      });
    });

    it('deja la categoría en null si la sugerencia no coincide con ninguna', async () => {
      createMock.mockResolvedValue({ output_text: JSON.stringify({ name: 'Mouse', description: 'Inalámbrico', categoryName: 'Cocina' }) });

      await expect(service.generateProductFromImage('https://img.test/a.png', categories)).resolves.toMatchObject({ categoryId: null, categoryName: null });
    });

    it('responde 502 si falla la llamada a OpenAI', async () => {
      createMock.mockRejectedValue(new Error('timeout'));

      await expect(service.generateProductFromImage('https://img.test/a.png', categories)).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('responde 400 si la IA devuelve algo que no es JSON o no trae nombre', async () => {
      createMock.mockResolvedValueOnce({ output_text: 'basura' });
      await expect(service.generateProductFromImage('https://img.test/a.png', categories)).rejects.toBeInstanceOf(BadRequestException);

      createMock.mockResolvedValueOnce({ output_text: JSON.stringify({ description: 'sin nombre' }) });
      await expect(service.generateProductFromImage('https://img.test/a.png', categories)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
