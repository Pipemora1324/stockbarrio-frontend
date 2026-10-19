import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, type Observable } from 'rxjs';
import type { AuthUser, Product, Store } from './models';

export interface Recommendation {
  suggestion: string;
  products: Array<{ name: string; offerPrice: number; quantity: number; total: number }>;
  total: number;
  savings: number;
  confidence: number;
}

export type ProductInput = Pick<Product, 'name' | 'category' | 'description' | 'price' | 'stock' | 'expirationDate' | 'discountPercent'>;

// Turns any HTTP failure into an Error with a Spanish message the UI can show as is.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const toApiError = (error: unknown, fallback: string): unknown => {
  if (!(error instanceof HttpErrorResponse)) return error;
  if (error.status === 0) return new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  const message = typeof error.error?.message === 'string' ? error.error.message : fallback;
  return new ApiError(message, error.status);
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  private async request<T>(request: Observable<T>, fallback: string): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      throw toApiError(error, fallback);
    }
  }

  async getStores(neighborhood?: string): Promise<Store[]> {
    const params = neighborhood ? { neighborhood } : undefined;
    return (await this.request(this.http.get<{ data: Store[] }>(`${this.baseUrl}/stores`, { params }), 'No se pudieron cargar las tiendas.')).data;
  }

  async getProducts(filters: { neighborhood?: string; category?: string; search?: string } = {}): Promise<Product[]> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value?.trim()) params[key] = value.trim();
    });
    return (await this.request(this.http.get<{ data: Product[] }>(`${this.baseUrl}/products`, { params }), 'No se pudieron cargar los productos.')).data;
  }

  register(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    return this.request(this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/auth/register`, payload), 'No se pudo crear la cuenta.');
  }

  login(payload: { email: string; password: string }): Promise<{ token: string; user: AuthUser }> {
    return this.request(this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/auth/login`, payload), 'No se pudo iniciar sesión.');
  }

  async me(): Promise<AuthUser> {
    return (await this.request(this.http.get<{ user: AuthUser }>(`${this.baseUrl}/auth/me`), 'No se pudo validar la sesión.')).user;
  }

  async getMyInventory(): Promise<{ products: Product[]; store: Store }> {
    const response = await this.request(this.http.get<{ data: Product[]; store: Store }>(`${this.baseUrl}/products/mine`), 'No se pudieron cargar los productos de tu tienda.');
    return { products: response.data, store: response.store };
  }

  async saveProduct(product: ProductInput): Promise<Product> {
    return (await this.request(this.http.post<{ data: Product }>(`${this.baseUrl}/products`, product), 'No se pudo guardar el producto.')).data;
  }

  async updateProduct(id: string, product: Partial<ProductInput>): Promise<Product> {
    return (await this.request(this.http.put<{ data: Product }>(`${this.baseUrl}/products/${id}`, product), 'No se pudo actualizar el producto.')).data;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(this.http.delete(`${this.baseUrl}/products/${id}`), 'No se pudo eliminar el producto.');
  }

  async recommend(payload: { budget: number; neighborhood: string; productIds: string[] }): Promise<Recommendation> {
    return (await this.request(this.http.post<{ data: Recommendation }>(`${this.baseUrl}/recommendations`, payload), 'No se pudo crear la recomendación.')).data;
  }
}
