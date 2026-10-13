import { ConfigModule } from '@nestjs/config';
import { App } from 'supertest/types';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { OrdersModule } from '../src/orders/orders.module';
import { join } from 'path';
import { CartItem } from '../src/cart/entities/cart-item.entity';
import { Category } from '../src/product/entities/category.entity';
import { Favorite } from '../src/favorites/entities/favorite.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { Product } from '../src/product/entities/product.entity';
import { Profile } from '../src/users/entities/profile.entity';
import { User } from '../src/users/entities/user.entity';
import { Status } from '../src/product/models/status.enum';
import { OrderStatus } from '../src/orders/entities/order-status.enum';
import { Role } from '../src/auth/roles/roles.enum';

// Las pruebas de integración necesitan un Postgres REAL (el bloqueo de filas no se puede simular).
// Se activan con TEST_DB_HOST/PORT/NAME/USER/PASSWORD. Usar una base DESCARTABLE: los tests la vacían.
// Ejemplo (contenedor efímero, sin volumen):
//   docker run -d --name orders-it-pg -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
//     -e POSTGRES_DB=orders_it -p 55432:5432 postgres:16-alpine
//   TEST_DB_HOST=localhost TEST_DB_PORT=55432 TEST_DB_NAME=orders_it TEST_DB_USER=test TEST_DB_PASSWORD=test \
//     npx jest --config test/jest-e2e.json --runInBand
export const testDbConfigured = () => ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_NAME', 'TEST_DB_USER', 'TEST_DB_PASSWORD'].every((key) => !!process.env[key]);

// Si falta la configuración la suite se omite, pero con un aviso visible: un verde silencioso no prueba nada.
export const describeWithDb = (name: string, fn: () => void) => {
  if (testDbConfigured()) {
    describe(name, fn);
    return;
  }
  console.warn(`[orders-integrity] OMITIDA "${name}": definí TEST_DB_HOST/PORT/NAME/USER/PASSWORD (ver orders-integrity.helpers.ts).`);
  describe.skip(name, fn);
};

export const ENTITIES = [User, Profile, Product, Category, CartItem, Favorite, Order, OrderItem];

export const dbOptions = (database = process.env.TEST_DB_NAME): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.TEST_DB_HOST,
  port: Number(process.env.TEST_DB_PORT),
  username: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD,
  database,
  entities: ENTITIES,
  migrations: [join(__dirname, '..', 'src', 'database', 'migrations', '*.ts')],
  synchronize: false,
});

// DataSource con el esquema completo (todas las migraciones aplicadas).
export const createMigratedDataSource = async () => {
  const dataSource = new DataSource(dbOptions());
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};

export const resetData = async (dataSource: DataSource) => {
  await dataSource.query('TRUNCATE TABLE "order_items", "orders", "cart_items", "favorites", "product_categories", "products", "categories", "users", "profiles" RESTART IDENTITY CASCADE');
};

let userCounter = 0;

export const seedUser = async (dataSource: DataSource, role: Role = Role.CLIENT) => {
  userCounter += 1;
  const repo = dataSource.getRepository(User);
  return repo.save(
    repo.create({
      email: `user${userCounter}@test.local`,
      password: 'password-de-prueba',
      role,
      emailVerified: true,
      profile: { name: 'Test', lastName: `User${userCounter}` } as Profile,
    }),
  );
};

export const seedProduct = async (dataSource: DataSource, input: { userId: number; name?: string; price?: number | null; stock?: number | null }) => {
  const repo = dataSource.getRepository(Product);
  return repo.save(
    repo.create({
      name: input.name ?? 'Producto de prueba',
      price: input.price === undefined ? 10 : (input.price as number),
      stock: input.stock === undefined ? 5 : (input.stock as number),
      status: Status.PUBLISHED,
      user: { id: input.userId } as User,
    }),
  );
};

export const seedCartItem = async (dataSource: DataSource, userId: number, productId: number, quantity: number) => {
  const repo = dataSource.getRepository(CartItem);
  return repo.save(repo.create({ userId, productId, quantity }));
};

export const seedOrder = async (dataSource: DataSource, input: { userId: number; status?: OrderStatus; items: Array<{ productId: number; productName?: string; quantity: number; unitPrice: number }>; createdAtHoursAgo?: number }) => {
  const orderRepo = dataSource.getRepository(Order);
  const order = await orderRepo.save(
    orderRepo.create({
      userId: input.userId,
      customerName: 'Cliente',
      customerEmail: 'cliente@test.local',
      shippingAddress: 'Calle Falsa 123',
      total: input.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
      status: input.status ?? OrderStatus.PENDING_PAYMENT,
    }),
  );
  const itemRepo = dataSource.getRepository(OrderItem);
  await itemRepo.save(input.items.map((i) => itemRepo.create({ orderId: order.id, productId: i.productId, productName: i.productName ?? 'Producto de prueba', quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.unitPrice * i.quantity })));
  if (input.createdAtHoursAgo !== undefined) {
    await dataSource.query(`UPDATE "orders" SET "created_at" = NOW() - ($1 * INTERVAL '1 hour') WHERE "id" = $2`, [input.createdAtHoursAgo, order.id]);
  }
  return order;
};

export const getStock = async (dataSource: DataSource, productId: number) => {
  const rows: Array<{ stock: number | null }> = await dataSource.query('SELECT "stock" FROM "products" WHERE "id" = $1', [productId]);
  return rows[0].stock;
};

// Reemplaza SOLO el login JWT: el usuario llega en el header x-test-user. El RolesGuard y el
// ValidationPipe son los reales, así se prueban permisos y validación de punta a punta.
const fakeJwtGuard = {
  canActivate: (context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const raw = req.headers['x-test-user'];
    if (!raw) return false;
    req.user = JSON.parse(raw) as unknown;
    return true;
  },
};

export const asUser = (sub: number, role: 'ADMIN' | 'CLIENT' | 'GUEST') => JSON.stringify({ sub, role });

// Módulo Nest real (OrdersModule + TypeORM) contra la base de pruebas, con las migraciones aplicadas.
export const createOrdersTestModule = async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      // pool amplio: los tests de concurrencia abren varias transacciones a la vez
      TypeOrmModule.forRoot({ ...dbOptions(), extra: { max: 30 } } as TypeOrmModuleOptions),
      OrdersModule,
    ],
  })
    .overrideGuard(AuthGuard('jwt'))
    .useValue(fakeJwtGuard)
    .compile();
  // Sin moduleRef.init(): el DataSource ya está listo tras compile(). Inicializar el módulo registraría el cron
  // real (y createHttpApp lo registraría de nuevo → "Cron Job ... already exists").
  const dataSource = moduleRef.get(DataSource);
  await dataSource.runMigrations();
  return { moduleRef, dataSource };
};

// App HTTP con el mismo ValidationPipe global que main.ts.
export const createHttpApp = async (moduleRef: TestingModule): Promise<INestApplication<App>> => {
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.init();
  return app;
};

// DataSource.query() devuelve any; este helper lo tipa para no esparcir any por los tests.
export type Row = Record<string, string | number | null>;
export const rows = async (dataSource: DataSource, sql: string, params: unknown[] = []): Promise<Row[]> => {
  const result: unknown = await dataSource.query(sql, params);
  return result as Row[];
};
