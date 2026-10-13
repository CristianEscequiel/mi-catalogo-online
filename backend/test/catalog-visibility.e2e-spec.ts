import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Role } from '../src/auth/roles/roles.enum';
import { Status } from '../src/product/models/status.enum';
import { User } from '../src/users/entities/user.entity';
import { asUser, createCatalogApp, createCatalogTestModule, describeWithDb, linkProductCategory, resetData, rows, seedCategory, seedProduct, seedUser } from './catalog-access.helpers';

interface ProductBody {
  id: number;
  name: string;
  categories: Array<{ id: number }>;
  user: Record<string, unknown> & { profile?: Record<string, unknown> };
}
interface PageBody {
  items: ProductBody[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

describeWithDb('catalog-access: visibilidad y paginación (Postgres real)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let app: INestApplication<App>;
  let owner: User;

  beforeAll(async () => {
    ({ moduleRef, dataSource } = await createCatalogTestModule());
    app = await createCatalogApp(moduleRef);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
    owner = await seedUser(dataSource, Role.GUEST);
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);
  const page = async (query = '') => (await get(`/products${query}`).expect(200)).body as PageBody;
  const names = (body: PageBody) => body.items.map((item) => item.name);

  describe('solo productos PUBLISHED (REQ-1)', () => {
    let published: { id: number };
    let draft: { id: number };
    let archived: { id: number };
    let category: { id: number };

    beforeEach(async () => {
      published = await seedProduct(dataSource, { userId: owner.id, name: 'Publicado', slug: 'publicado', status: Status.PUBLISHED });
      draft = await seedProduct(dataSource, { userId: owner.id, name: 'Borrador', slug: 'borrador', status: Status.DRAFT });
      archived = await seedProduct(dataSource, { userId: owner.id, name: 'Archivado', slug: 'archivado', status: Status.ARCHIVED });
      category = await seedCategory(dataSource, { userId: owner.id });
      for (const product of [published, draft, archived]) {
        await linkProductCategory(dataSource, product.id, category.id);
      }
    });

    it('GET /products devuelve solo los publicados (REQ-1.1)', async () => {
      const body = await page();

      expect(names(body)).toEqual(['Publicado']);
      expect(body.total).toBe(1);
    });

    it('GET /products/:id y /slug/:slug de un DRAFT o ARCHIVED responden 404 igual que un id inexistente (REQ-1.2)', async () => {
      const missing = await get('/products/999999').expect(404);

      for (const product of [draft, archived]) {
        const byId = await get(`/products/${product.id}`).expect(404);
        expect((byId.body as { message: string }).message).toContain('not found');
        expect((byId.body as { statusCode: number }).statusCode).toBe((missing.body as { statusCode: number }).statusCode);
      }
      await get('/products/slug/borrador').expect(404);
      await get('/products/slug/archivado').expect(404);

      expect(((await get(`/products/${published.id}`).expect(200)).body as ProductBody).name).toBe('Publicado');
      expect(((await get('/products/slug/publicado').expect(200)).body as ProductBody).name).toBe('Publicado');
    });

    it('GET /products/user/:id devuelve solo publicados y [] con 200 si no tiene ninguno (REQ-1.3)', async () => {
      const body = (await get(`/products/user/${owner.id}`).expect(200)).body as ProductBody[];
      expect(body.map((item) => item.name)).toEqual(['Publicado']);

      const other = await seedUser(dataSource, Role.GUEST);
      expect((await get(`/products/user/${other.id}`).expect(200)).body).toEqual([]);
    });

    it('GET /categories/:id/posts devuelve solo publicados (REQ-1.4)', async () => {
      const body = (await get(`/categories/${category.id}/posts`).expect(200)).body as ProductBody[];

      expect(body.map((item) => item.name)).toEqual(['Publicado']);
    });

    it('GET /users/:id/products devuelve los tres estados al dueño y a un ADMIN (REQ-1.7)', async () => {
      const asOwner = await get(`/users/${owner.id}/products`).set('x-test-user', asUser(owner.id, 'GUEST')).expect(200);
      expect((asOwner.body as ProductBody[]).map((item) => item.name).sort()).toEqual(['Archivado', 'Borrador', 'Publicado']);

      const asAdmin = await get(`/users/${owner.id}/products`)
        .set('x-test-user', asUser(owner.id + 100, 'ADMIN'))
        .expect(200);
      expect((asAdmin.body as ProductBody[]).map((item) => item.name).sort()).toEqual(['Archivado', 'Borrador', 'Publicado']);
    });

    it('recorrer los endpoints públicos no cambia ningún estado (REQ-1.8)', async () => {
      const statuses = () => rows(dataSource, 'SELECT "id", "status" FROM "products" ORDER BY "id"');
      const before = await statuses();

      await get('/products');
      await get(`/products/${draft.id}`);
      await get('/products/slug/archivado');
      await get(`/products/user/${owner.id}`);
      await get(`/categories/${category.id}/posts`);

      expect(await statuses()).toEqual(before);
    });
  });

  describe('paginación (REQ-2)', () => {
    // 30 productos publicados: el más nuevo es "Producto 30".
    const seedMany = async (count = 30) => {
      for (let i = 1; i <= count; i++) {
        await seedProduct(dataSource, { userId: owner.id, name: `Producto ${String(i).padStart(2, '0')}` });
      }
    };

    it('usa page 1 y limit 12 por defecto y calcula total y totalPages (REQ-2.1, 2.2)', async () => {
      await seedMany();

      const body = await page();

      expect(body).toMatchObject({ page: 1, limit: 12, total: 30, totalPages: 3 });
      expect(body.items).toHaveLength(12);
    });

    it('ordena del más nuevo al más antiguo y las páginas no repiten ni omiten (REQ-2.9)', async () => {
      await seedMany();

      const all: string[] = [];
      for (const number of [1, 2, 3]) {
        const body = await page(`?page=${number}&limit=12`);
        all.push(...names(body));
      }

      expect(all).toHaveLength(30);
      expect(new Set(all).size).toBe(30);
      expect(all).toEqual(Array.from({ length: 30 }, (_, index) => `Producto ${String(30 - index).padStart(2, '0')}`));
    });

    it('busca sin distinguir mayúsculas en nombre y descripción (REQ-2.4)', async () => {
      await seedProduct(dataSource, { userId: owner.id, name: 'Teclado mecánico' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Mouse', description: 'Compatible con cualquier TECLADO' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Monitor' });

      const body = await page('?search=teclado');

      expect(names(body).sort()).toEqual(['Mouse', 'Teclado mecánico']);
      expect(body.total).toBe(2);
    });

    it('% y _ del texto buscado se tratan como caracteres literales (REQ-2.4)', async () => {
      await seedProduct(dataSource, { userId: owner.id, name: 'Oferta 50% off' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Cable a_b' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Cable aXb' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Otro' });

      expect(names(await page('?search=%25'))).toEqual(['Oferta 50% off']); // search=%
      expect(names(await page('?search=_'))).toEqual(['Cable a_b']); // search=_
      expect(names(await page('?search=a_b'))).toEqual(['Cable a_b']);
    });

    it('filtra por categoryId y cada producto conserva todas sus categorías (REQ-2.6)', async () => {
      const keyboards = await seedCategory(dataSource, { userId: owner.id, name: 'Teclados' });
      const mice = await seedCategory(dataSource, { userId: owner.id, name: 'Mouses' });
      const both = await seedProduct(dataSource, { userId: owner.id, name: 'En las dos' });
      const onlyMice = await seedProduct(dataSource, { userId: owner.id, name: 'Solo mouses' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Sin categoría' });
      await linkProductCategory(dataSource, both.id, keyboards.id);
      await linkProductCategory(dataSource, both.id, mice.id);
      await linkProductCategory(dataSource, onlyMice.id, mice.id);

      const body = await page(`?categoryId=${keyboards.id}`);

      expect(names(body)).toEqual(['En las dos']);
      expect(body.items[0].categories.map((category) => category.id).sort()).toEqual([keyboards.id, mice.id].sort());
      expect(body.total).toBe(1);
      expect(names(await page(`?categoryId=${mice.id}`))).toEqual(['Solo mouses', 'En las dos']);
    });

    it('un producto con dos categorías no se duplica ni rompe el conteo (REQ-2.1, 2.6)', async () => {
      const a = await seedCategory(dataSource, { userId: owner.id });
      const b = await seedCategory(dataSource, { userId: owner.id });
      const product = await seedProduct(dataSource, { userId: owner.id });
      await linkProductCategory(dataSource, product.id, a.id);
      await linkProductCategory(dataSource, product.id, b.id);

      const body = await page('?limit=1');

      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);
      expect(body.totalPages).toBe(1);
    });

    it('combina search y categoryId (REQ-2.8)', async () => {
      const category = await seedCategory(dataSource, { userId: owner.id });
      const keyboard = await seedProduct(dataSource, { userId: owner.id, name: 'Teclado' });
      const mouse = await seedProduct(dataSource, { userId: owner.id, name: 'Mouse' });
      await seedProduct(dataSource, { userId: owner.id, name: 'Teclado sin categoría' });
      await linkProductCategory(dataSource, keyboard.id, category.id);
      await linkProductCategory(dataSource, mouse.id, category.id);

      expect(names(await page(`?search=teclado&categoryId=${category.id}`))).toEqual(['Teclado']);
    });

    it('una página fuera de rango responde 200 con items vacío y el total real (REQ-2.10)', async () => {
      await seedMany(5);

      const body = await page('?page=99');

      expect(body).toMatchObject({ items: [], total: 5, page: 99, totalPages: 1 });
    });

    it('sin coincidencias responde total 0 y totalPages 0 (REQ-2.11)', async () => {
      await seedMany(3);

      expect(await page('?search=zzz')).toMatchObject({ items: [], total: 0, totalPages: 0 });
    });

    it.each([
      ['limit 51', '?limit=51'],
      ['limit 0', '?limit=0'],
      ['limit decimal', '?limit=1.5'],
      ['limit no numérico', '?limit=abc'],
      ['page 0', '?page=0'],
      ['page negativa', '?page=-1'],
      ['categoryId 0', '?categoryId=0'],
      ['categoryId no numérico', '?categoryId=abc'],
      ['search de 101 caracteres', `?search=${'a'.repeat(101)}`],
      ['parámetro desconocido', '?orderBy=price'],
    ])('rechaza %s con 400 (REQ-2.3, 2.5, 2.7)', async (_label, query) => {
      await get(`/products${query}`).expect(400);
    });

    it('acepta limit 50 y search de 100 caracteres (REQ-2.3, 2.5)', async () => {
      await get('/products?limit=50').expect(200);
      await get(`/products?search=${'a'.repeat(100)}`).expect(200);
    });

    it('el dueño llega solo con id y nombre/apellido/avatar del perfil (REQ-2.12)', async () => {
      await seedProduct(dataSource, { userId: owner.id, name: 'Con dueño' });

      const { user } = (await page()).items[0];

      expect(Object.keys(user).sort()).toEqual(['id', 'profile']);
      expect(user.id).toBe(owner.id);
      expect(Object.keys(user.profile ?? {}).every((key) => ['name', 'lastName', 'avatar'].includes(key))).toBe(true);
      expect(JSON.stringify(user)).not.toMatch(/email|password|role|token/i);
    });
  });
});
