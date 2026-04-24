import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ProductModel } from '../models/product.model';
import { firstValueFrom, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { ProductResModel } from '../models/prd-res.model';

interface ImageMutationResponse {
  id: number;
  imageUrl: string | null;
}

export interface ProductImageCategoryOption {
  id: number;
  name: string;
}

export interface GenerateProductFromImageRequest {
  imageUrl: string;
  categories: ProductImageCategoryOption[];
}

export interface GenerateProductFromImageResponse {
  name: string;
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  slug: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = API_BASE_URL;

  getProductById(id: number) {
    return this.http.get<ProductResModel>(`${this.apiUrl}/products/${id}`)
  }

  getProductBySlug(slug: string): Observable<ProductResModel> {
    return this.http.get<ProductResModel>(`${this.apiUrl}/products/slug/${encodeURIComponent(slug)}`);
  }

  async postProduct(body: ProductModel) {
    const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/products`, body))
    return res
  }

  getAllProducts(): Observable<ProductResModel[]> {
    return this.http.get<ProductResModel[]>(`${this.apiUrl}/products`);
  }

  getProductsByUserId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${id}/products`);
  }

  getDescriptionByAi(name: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products/generate-ai/${name}`);
  }

  generateFromImage(body: GenerateProductFromImageRequest): Observable<GenerateProductFromImageResponse> {
    return this.http.post<GenerateProductFromImageResponse>(`${this.apiUrl}/products/generate-from-image`, body);
  }

  editProduct(id:number , body:ProductModel): Observable<any>{
    return this.http.put<any>(`${this.apiUrl}/products/${id}`, body)
  }

  deleteProduct(id:number): Observable<any>{
    return this.http.delete<any>(`${this.apiUrl}/products/${id}`)
  }

  uploadProductImage(id: number, file: File): Observable<ImageMutationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImageMutationResponse>(`${this.apiUrl}/products/${id}/image`, formData);
  }

  deleteProductImage(id: number): Observable<ImageMutationResponse> {
    return this.http.delete<ImageMutationResponse>(`${this.apiUrl}/products/${id}/image`);
  }

}
