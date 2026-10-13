import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createControllerApp } from '../../test/controller-testing';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

describe('FavoritesController', () => {
  let app: INestApplication<App>;
  const favorites = { findAllByUser: jest.fn(), add: jest.fn(), remove: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    app = await createControllerApp(FavoritesController, [{ provide: FavoritesService, useValue: favorites }], { sub: 7, role: 'CLIENT' });
  });

  afterEach(() => app.close());

  it('GET /favorites lista los favoritos del usuario autenticado', async () => {
    favorites.findAllByUser.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/favorites').expect(200);
    expect(favorites.findAllByUser).toHaveBeenCalledWith(7);
  });

  it('POST /favorites/:productId agrega al usuario autenticado el producto de la URL', async () => {
    favorites.add.mockResolvedValue({});

    await request(app.getHttpServer()).post('/favorites/12').expect(201);
    expect(favorites.add).toHaveBeenCalledWith(7, 12);
  });

  it('DELETE /favorites/:productId quita del usuario autenticado el producto de la URL', async () => {
    favorites.remove.mockResolvedValue({});

    await request(app.getHttpServer()).delete('/favorites/12').expect(200);
    expect(favorites.remove).toHaveBeenCalledWith(7, 12);
  });

  it('un productId que no es número se rechaza antes del servicio', async () => {
    await request(app.getHttpServer()).post('/favorites/abc').expect(400);
    expect(favorites.add).not.toHaveBeenCalled();
  });
});
