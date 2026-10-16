import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { API_BASE_URL } from '../../config/api.config';
import { CategoryModel } from './category.model';
import { CategoryService } from './category.service';

describe('CategoryService (llamadas HTTP)', () => {
  let service: CategoryService;
  let http: HttpTestingController;

  const body: CategoryModel = { name: 'Remeras', description: 'Algodón', imageUrl: null };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('REQ-5.4: getCategories hace GET /categories', () => {
    service.getCategories().subscribe();

    const req = http.expectOne(`${API_BASE_URL}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('REQ-5.4: getCategoriesByUserId hace GET /users/:id/categories', () => {
    service.getCategoriesByUserId(7).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/users/7/categories`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('REQ-5.4: createCategory hace POST /categories con el cuerpo recibido', () => {
    service.createCategory(body).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/categories`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 1, ...body });
  });

  it('REQ-5.4: editCategory hace PUT /categories/:id con el cuerpo recibido', () => {
    service.editCategory(3, body).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/categories/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 3, ...body });
  });

  it('REQ-5.4: deleteCategory hace DELETE /categories/:id', () => {
    service.deleteCategory(3).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/categories/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('REQ-5.4: uploadCategoryImage hace POST /categories/:id/image con el archivo en el campo "file"', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    service.uploadCategoryImage(3, file).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/categories/3/image`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({ id: 3, imageUrl: '/uploads/categories/foto.png' });
  });

  it('REQ-5.4: deleteCategoryImage hace DELETE /categories/:id/image', () => {
    service.deleteCategoryImage(3).subscribe();

    const req = http.expectOne(`${API_BASE_URL}/categories/3/image`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 3, imageUrl: null });
  });
});
