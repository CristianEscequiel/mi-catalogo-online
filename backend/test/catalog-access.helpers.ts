import { ConfigModule } from '@nestjs/config';
import { App } from 'supertest/types';
import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { OpenaiService } from '../src/ai/service/openai.service';
import { CartModule } from '../src/cart/cart.module';
import { FavoritesModule } from '../src/favorites/favorites.module';
import { OrdersModule } from '../src/orders/orders.module';
import { Category } from '../src/product/entities/category.entity';
import { ProductModule } from '../src/product/product.module';
import { User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';
import { dbOptions, fakeJwtGuard } from './orders-integrity.helpers';

// Reutiliza el arnés de orders-integrity (base de pruebas real, siembra, usuario por header x-test-user)
// y le suma el catálogo completo: productos, categorías, usuarios, carrito, favoritos y órdenes.
export { asUser, describeWithDb, getStock, resetData, rows, seedCartItem, seedProduct, seedUser } from './orders-integrity.helpers';

export interface OpenaiDouble {
  generateProductContent: jest.Mock;
  generateProductFromImage: jest.Mock;
}

// Doble de OpenAI que cuenta las llamadas: el test comprueba que el tope las corta ANTES de llegar acá.
export const createOpenaiDouble = (): OpenaiDouble => ({
  generateProductContent: jest.fn().mockResolvedValue({ description: 'Descripción generada', slug: 'producto' }),
  generateProductFromImage: jest.fn().mockResolvedValue({ name: 'Producto', description: 'Descripción', categoryId: null, categoryName: null, slug: 'producto' }),
});

export const createCatalogTestModule = async (env: Record<string, string> = {}) => {
  // Las subidas de imagen van a una carpeta temporal, nunca al `uploads/` del repo.
  const uploadsDir = mkdtempSync(join(tmpdir(), 'catalog-access-uploads-'));
  process.env.UPLOADS_DIR = uploadsDir;
  // El tope de IA lee su configuración al crear el módulo.
  for (const key of ['AI_RATE_LIMIT', 'AI_RATE_TTL_SECONDS']) {
    delete process.env[key];
  }
  Object.assign(process.env, env);

  const openai = createOpenaiDouble();
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), TypeOrmModule.forRoot({ ...dbOptions(), extra: { max: 30 } } as TypeOrmModuleOptions), ProductModule, UsersModule, CartModule, FavoritesModule, OrdersModule],
  })
    .overrideGuard(AuthGuard('jwt'))
    .useValue(fakeJwtGuard)
    .overrideProvider(OpenaiService)
    .useValue(openai)
    .compile();

  const dataSource = moduleRef.get(DataSource);
  await dataSource.runMigrations();
  return { moduleRef, dataSource, openai, uploadsDir };
};

// Igual que main.ts: ValidationPipe global y ClassSerializerInterceptor (aplica el @Transform del dueño del producto).
export const createCatalogApp = async (moduleRef: TestingModule): Promise<INestApplication<App>> => {
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.init();
  return app;
};

let categoryCounter = 0;

// `userId: null` crea una categoría sin dueño (la columna user_id admite NULL).
export const seedCategory = async (dataSource: DataSource, input: { userId: number | null; name?: string }) => {
  categoryCounter += 1;
  const repo = dataSource.getRepository(Category);
  return repo.save(repo.create({ name: input.name ?? `Categoría ${categoryCounter}`, user: input.userId === null ? undefined : ({ id: input.userId } as User) }));
};

export const linkProductCategory = async (dataSource: DataSource, productId: number, categoryId: number) => {
  await dataSource.query('INSERT INTO "product_categories" ("product_id", "category_id") VALUES ($1, $2)', [productId, categoryId]);
};
