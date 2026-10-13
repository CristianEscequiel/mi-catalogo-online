import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createCatalogApp, createCatalogTestModule, describeWithDb, resetData } from './catalog-access.helpers';

describeWithDb('catalog-access: arnés (humo)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ moduleRef, dataSource } = await createCatalogTestModule());
    app = await createCatalogApp(moduleRef);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await resetData(dataSource);
  });

  it('GET /products sobre una base vacía responde la forma de página (REQ-2.1, 2.11)', async () => {
    const response = await request(app.getHttpServer()).get('/products').expect(200);

    expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 });
  });
});
