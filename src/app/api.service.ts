import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, type Observable } from 'rxjs';
import type { ChatResponse, ChatTurn, Offer, OfferQuery, AlertInput, AlertSubscription, AppNotification, AppliedDiscount, AuthUser, Coordinates, DiscountSuggestion, Product, Store } from './models';

export interface Recommendation {
  suggestion: string;
  products: Array<{ productId: string; name: string; price: number; offerPrice: number; quantity: number; total: number; expirationDate: string }>;
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

  async getCategories(): Promise<string[]> {
    return (await this.request(this.http.get<{ data: string[] }>(`${this.baseUrl}/products/categories`), 'No se pudieron cargar las categorías.')).data;
  }

  // The optional location travels in the body and is not stored by the API.
  searchOffers(query: OfferQuery): Promise<{ data: Offer[]; total: number }> {
    return this.request(this.http.post<{ data: Offer[]; total: number }>(`${this.baseUrl}/offers/search`, query), 'No se pudieron cargar las ofertas.');
  }

  async getNeighborhoods(): Promise<string[]> {
    return (await this.request(this.http.get<{ data: string[] }>(`${this.baseUrl}/stores/neighborhoods`), 'No se pudieron cargar los barrios.')).data;
  }

  // Sends the last turns of the conversation; the optional location is used only for distances and is not stored.
  async chat(payload: { messages: ChatTurn[]; neighborhood?: string } & Partial<Coordinates>): Promise<ChatResponse> {
    return (await this.request(this.http.post<{ data: ChatResponse }>(`${this.baseUrl}/assistant/chat`, payload), 'El asistente no pudo responder. Inténtalo de nuevo.')).data;
  }

  updateMyStoreLocation(payload: { latitude: number | null; longitude: number | null }): Promise<{ data: Store; message: string }> {
    return this.request(this.http.put<{ data: Store; message: string }>(`${this.baseUrl}/stores/me`, payload), 'No se pudo guardar la ubicación de la tienda.');
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

  async getSuggestions(): Promise<DiscountSuggestion[]> {
    return (await this.request(this.http.get<{ data: DiscountSuggestion[] }>(`${this.baseUrl}/suggestions`), 'No se pudieron cargar las sugerencias de descuento.')).data;
  }

  approveSuggestion(id: string): Promise<{ data: AppliedDiscount; message: string }> {
    return this.request(this.http.post<{ data: AppliedDiscount; message: string }>(`${this.baseUrl}/suggestions/${id}/approve`, {}), 'No se pudo aplicar el descuento.');
  }

  rejectSuggestion(id: string): Promise<{ message: string }> {
    return this.request(this.http.post<{ message: string }>(`${this.baseUrl}/suggestions/${id}/reject`, {}), 'No se pudo descartar la sugerencia.');
  }

  approveAllSuggestions(): Promise<{ data: AppliedDiscount[]; message: string }> {
    return this.request(this.http.post<{ data: AppliedDiscount[]; message: string }>(`${this.baseUrl}/suggestions/approve-all`, {}), 'No se pudieron aplicar los descuentos.');
  }

  async getAlerts(): Promise<AlertSubscription[]> {
    return (await this.request(this.http.get<{ data: AlertSubscription[] }>(`${this.baseUrl}/alerts`), 'No se pudieron cargar tus alertas.')).data;
  }

  createAlert(alert: AlertInput): Promise<{ data: AlertSubscription; message: string }> {
    return this.request(this.http.post<{ data: AlertSubscription; message: string }>(`${this.baseUrl}/alerts`, alert), 'No se pudo crear la alerta.');
  }

  async deleteAlert(id: string): Promise<void> {
    await this.request(this.http.delete(`${this.baseUrl}/alerts/${id}`), 'No se pudo eliminar la alerta.');
  }

  getNotifications(): Promise<{ data: AppNotification[]; unread: number }> {
    return this.request(this.http.get<{ data: AppNotification[]; unread: number }>(`${this.baseUrl}/notifications`), 'No se pudieron cargar tus notificaciones.');
  }

  async getUnreadCount(): Promise<number> {
    return (await this.request(this.http.get<{ unread: number }>(`${this.baseUrl}/notifications/unread-count`), 'No se pudo consultar las notificaciones.')).unread;
  }

  async markNotificationRead(id: string): Promise<number> {
    return (await this.request(this.http.post<{ unread: number }>(`${this.baseUrl}/notifications/${id}/read`, {}), 'No se pudo marcar como leída.')).unread;
  }

  async markAllNotificationsRead(): Promise<number> {
    return (await this.request(this.http.post<{ unread: number }>(`${this.baseUrl}/notifications/read-all`, {}), 'No se pudieron marcar como leídas.')).unread;
  }

  async recommend(payload: { budget: number; neighborhood: string; productIds: string[] }): Promise<Recommendation> {
    return (await this.request(this.http.post<{ data: Recommendation }>(`${this.baseUrl}/recommendations`, payload), 'No se pudo crear la recomendación.')).data;
  }
}
