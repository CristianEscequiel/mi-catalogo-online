import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Role } from '../src/auth/roles/roles.enum';
import { User } from '../src/users/entities/user.entity';
import { asUser, createCatalogApp, createCatalogTestModule, describeWithDb, resetData, rows, seedCategory, seedProduct, seedUser } from './catalog-access.helpers';

describeWithDb('catalog-access: propiedad de productos y categorías (Postgres real)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let app: INestApplication<App>;
  let uploadsDir: string;
  let admin: User;
  let owner: User;
  let stranger: User;
  let client: User;

  beforeAll(async () => {
    ({ moduleRef, dataSource, uploadsDir } = await createCatalogTestModule());
    app = await createCatalogApp(moduleRef);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
    admin = await seedUser(dataSource, Role.ADMIN);
    owner = await seedUser(dataSource, Role.GUEST);
    stranger = await seedUser(dataSource, Role.GUEST);
    client = await seedUser(dataSource, Role.CLIENT);
  });

  const as = (user: User) => asUser(user.id, user.role as 'ADMIN' | 'CLIENT' | 'GUEST');
  const png = { filename: 'foto.png', contentType: 'image/png' };

  // Los dos recursos tienen las mismas cuatro operaciones protegidas; cambia cómo se siembran y dónde guardan la imagen.
  const kinds = [
    {
      name: 'products',
      table: 'products',
      imageColumn: 'thumbnail_url',
      seed: async (ownerId: number | null) => seedProduct(dataSource, { userId: ownerId as number, name: 'Original' }),
    },
    {
      name: 'categories',
      table: 'categories',
      imageColumn: 'image_url',
      seed: async (ownerId: number | null) => seedCategory(dataSource, { userId: ownerId, name: 'Original' }),
    },
  ];

  describe.each(kinds)('/$name', ({ name, table, imageColumn, seed }) => {
    const folderDir = () => join(uploadsDir, name);
    const publicPath = `/uploads/${name}/viejo.png`;

    // Recurso con una imagen real en disco, para comprobar que un rechazo no la borra ni la reemplaza.
    const seedWithImage = async (ownerId: number | null) => {
      const resource = await seed(ownerId);
      writeFileSync(join(folderDir(), 'viejo.png'), 'imagen-vieja');
      await dataSource.query(`UPDATE "${table}" SET "${imageColumn}" = $1 WHERE "id" = $2`, [publicPath, resource.id]);
      return resource;
    };
    const row = async (id: number) => (await rows(dataSource, `SELECT "name", "${imageColumn}" AS image FROM "${table}" WHERE "id" = $1`, [id]))[0];
    const filesOnDisk = () => readdirSync(folderDir());

    // Cada test parte con la carpeta de subidas vacía.
    beforeEach(() => {
      for (const file of readdirSync(folderDir())) {
        rmSync(join(folderDir(), file), { force: true });
      }
    });

    const ops = {
      update: (id: number, user: User) => request(app.getHttpServer()).put(`/${name}/${id}`).set('x-test-user', as(user)).send({ name: 'Cambiado' }),
      remove: (id: number, user: User) => request(app.getHttpServer()).delete(`/${name}/${id}`).set('x-test-user', as(user)),
      upload: (id: number, user: User) => request(app.getHttpServer()).post(`/${name}/${id}/image`).set('x-test-user', as(user)).attach('file', Buffer.from('imagen-nueva'), png),
      deleteImage: (id: number, user: User) => request(app.getHttpServer()).delete(`/${name}/${id}/image`).set('x-test-user', as(user)),
    };

    it.each(['update', 'remove', 'upload', 'deleteImage'] as const)('GUEST ajeno: %s responde 403 y no cambia nada (REQ-3.1, 3.2, 3.7)', async (op) => {
      const resource = await seedWithImage(owner.id);

      await ops[op](resource.id, stranger).expect(403);

      expect(await row(resource.id)).toEqual({ name: 'Original', image: publicPath });
      expect(existsSync(join(folderDir(), 'viejo.png'))).toBe(true);
      expect(filesOnDisk()).toEqual(['viejo.png']); // ni siquiera queda el archivo recién subido
    });

    it('GUEST dueño: edita, sube y borra la imagen y elimina lo suyo (REQ-3.3)', async () => {
      const resource = await seed(owner.id);

      await ops.update(resource.id, owner).expect(200);
      expect((await row(resource.id)).name).toBe('Cambiado');

      await ops.upload(resource.id, owner).expect(201);
      const uploaded = (await row(resource.id)).image as string;
      expect(uploaded).toMatch(new RegExp(`^/uploads/${name}/`));
      expect(filesOnDisk()).toHaveLength(1);

      await ops.deleteImage(resource.id, owner).expect(200);
      expect((await row(resource.id)).image).toBeNull();
      expect(filesOnDisk()).toHaveLength(0);

      await ops.remove(resource.id, owner).expect(200);
      expect(await rows(dataSource, `SELECT 1 FROM "${table}" WHERE "id" = $1`, [resource.id])).toHaveLength(0);
    });

    it('ADMIN: puede hacer las cuatro operaciones sobre lo de otro (REQ-3.4)', async () => {
      const resource = await seed(owner.id);

      await ops.update(resource.id, admin).expect(200);
      await ops.upload(resource.id, admin).expect(201);
      await ops.deleteImage(resource.id, admin).expect(200);
      await ops.remove(resource.id, admin).expect(200);

      expect(await rows(dataSource, `SELECT 1 FROM "${table}" WHERE "id" = $1`, [resource.id])).toHaveLength(0);
    });

    it.each(['update', 'remove', 'upload', 'deleteImage'] as const)('id inexistente: %s responde 404 para ADMIN y GUEST (REQ-3.5)', async (op) => {
      await ops[op](999999, admin).expect(404);
      await ops[op](999999, owner).expect(404);

      expect(filesOnDisk()).toEqual([]); // la subida a un id inexistente no deja archivo huérfano
    });

    it.each(['update', 'remove', 'upload', 'deleteImage'] as const)('CLIENT: %s responde 403 y no cambia nada (REQ-3.6)', async (op) => {
      const resource = await seedWithImage(owner.id);

      await ops[op](resource.id, client).expect(403);

      expect(await row(resource.id)).toEqual({ name: 'Original', image: publicPath });
      expect(existsSync(join(folderDir(), 'viejo.png'))).toBe(true);
    });

    it('sin sesión se rechaza antes de llegar al servicio (REQ-3.6)', async () => {
      const resource = await seed(owner.id);

      // El arnés reemplaza AuthGuard('jwt') por uno que devuelve false: Nest responde 403. En producción el
      // guard real responde 401; esta spec no cambia ese guard.
      await request(app.getHttpServer()).put(`/${name}/${resource.id}`).send({ name: 'Cambiado' }).expect(403);
      await request(app.getHttpServer()).delete(`/${name}/${resource.id}`).expect(403);

      expect((await row(resource.id)).name).toBe('Original');
    });
  });

  describe('categoría sin dueño', () => {
    it('un GUEST recibe 403 y un ADMIN puede modificarla (REQ-3.2, 3.4)', async () => {
      const orphan = await seedCategory(dataSource, { userId: null, name: 'Huérfana' });

      await request(app.getHttpServer()).put(`/categories/${orphan.id}`).set('x-test-user', as(owner)).send({ name: 'Mía' }).expect(403);
      await request(app.getHttpServer()).put(`/categories/${orphan.id}`).set('x-test-user', as(admin)).send({ name: 'Del admin' }).expect(200);

      expect((await rows(dataSource, 'SELECT "name" FROM "categories" WHERE "id" = $1', [orphan.id]))[0].name).toBe('Del admin');
    });
  });

  describe('la respuesta de la categoría no expone al dueño', () => {
    it('PUT /categories/:id devuelve la misma forma que antes (sin user)', async () => {
      const category = await seedCategory(dataSource, { userId: owner.id, name: 'Propia' });

      const response = await request(app.getHttpServer()).put(`/categories/${category.id}`).set('x-test-user', as(owner)).send({ name: 'Editada' }).expect(200);

      expect(response.body).not.toHaveProperty('user');
      expect((response.body as { name: string }).name).toBe('Editada');
    });
  });
});
