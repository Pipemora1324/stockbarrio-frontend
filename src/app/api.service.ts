import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

  private async authRequest<T>(path: 'login' | 'register', payload: Record<string, unknown>, fallback: string): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(`${this.baseUrl}/auth/${path}`, payload));
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const message = typeof error.error?.message === 'string' ? error.error.message : undefined;
        throw new Error(message ?? (error.status === 0 ? 'No se pudo conectar con el servidor.' : fallback));
      }
      throw error;
    }
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
    return this.authRequest<{ token: string; user: AuthUser }>('register', payload, 'No se pudo crear la cuenta.');
  }

  async login(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    return this.authRequest<{ token: string; user: AuthUser }>('login', payload, 'No se pudo iniciar sesión.');
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
