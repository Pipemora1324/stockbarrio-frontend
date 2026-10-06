import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AuthUser, Product, Store } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  private get headers(): Record<string, string> {
    const token = localStorage.getItem('stockbarrios-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getStores(neighborhood?: string): Promise<Store[]> {
    const response = await firstValueFrom(this.http.get<{ data: Store[] }>(`${this.baseUrl}/stores${neighborhood ? `?neighborhood=${encodeURIComponent(neighborhood)}` : ''}`, { headers: this.headers }));
    return response.data;
  }

  async getProducts(filters: { neighborhood?: string; category?: string; search?: string } = {}): Promise<Product[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const response = await firstValueFrom(this.http.get<{ data: Product[] }>(`${this.baseUrl}/products?${params}`, { headers: this.headers }));
    return response.data;
  }

  async register(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    return firstValueFrom(this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/auth/register`, payload));
  }

  async login(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    return firstValueFrom(this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/auth/login`, payload));
  }

  async getStoreProducts(storeId: string): Promise<Product[]> {
    const response = await firstValueFrom(this.http.get<{ data: Product[] }>(`${this.baseUrl}/products/store/${storeId}`, { headers: this.headers }));
    return response.data;
  }

  async saveProduct(product: Partial<Product> & { name: string; price: number; stock: number; expirationDate: string; discountPercent: number }): Promise<Product> {
    const response = await firstValueFrom(this.http.post<{ data: Product }>(`${this.baseUrl}/products`, product, { headers: this.headers }));
    return response.data;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const response = await firstValueFrom(this.http.put<{ data: Product }>(`${this.baseUrl}/products/${id}`, product, { headers: this.headers }));
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/products/${id}`, { headers: this.headers }));
  }

  async recommend(payload: { budget: number; neighborhood: string; productIds: string[] }): Promise<{ suggestion: string; products: Array<{ name: string; offerPrice: number; quantity: number; total: number }>; total: number; savings: number; confidence: number }> {
    const response = await firstValueFrom(this.http.post<{ data: { suggestion: string; products: Array<{ name: string; offerPrice: number; quantity: number; total: number }>; total: number; savings: number; confidence: number } }>(`${this.baseUrl}/recommendations`, payload, { headers: this.headers }));
    return response.data;
  }
}
