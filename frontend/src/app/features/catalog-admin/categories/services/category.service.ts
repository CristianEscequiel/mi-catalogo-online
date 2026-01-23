import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryModel, CategoryResModel } from '../models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

  getCategories(): Observable<CategoryResModel[]> {
    return this.http.get<CategoryResModel[]>(`${this.apiUrl}/categories`);
  }

  createCategory(body: CategoryModel): Observable<CategoryResModel> {
    return this.http.post<CategoryResModel>(`${this.apiUrl}/categories`, body);
  }

  editCategory(id: number, body: CategoryModel): Observable<CategoryResModel> {
    return this.http.put<CategoryResModel>(`${this.apiUrl}/categories/${id}`, body);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
  }
}
