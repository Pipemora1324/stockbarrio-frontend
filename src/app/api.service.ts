import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, type Observable } from 'rxjs';
import type { AccountProfile, SessionUpdate, ChatResponse, ChatTurn, Offer, OfferQuery, AppliedDiscount, AuthUser, CatalogGroup, DiscountSuggestion, InventoryProduct, OwnedStore, Product, Store, StoreInput } from './models';

// Offer dates are 'YYYY-MM-DD' days (Bogota); null when the product has no discount.
export type ProductInput = Pick<Product, 'name' | 'category' | 'description' | 'price' | 'stock' | 'expirationDate' | 'discountPercent'> & { offerStartsOn: string | null; offerEndsOn: string | null };
export interface OfferRange { offerStartsOn: string; offerEndsOn: string; }
export interface Inventory { products: InventoryProduct[]; store: OwnedStore; stores: OwnedStore[]; today: string; }

// ?storeId= for the store chosen in the panel (the API uses the main store without it).
const storeParams = (storeId?: string) => (storeId ? { params: { storeId } } : {});

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

  searchOffers(query: OfferQuery): Promise<{ data: Offer[]; total: number }> {
    return this.request(this.http.post<{ data: Offer[]; total: number }>(`${this.baseUrl}/offers/search`, query), 'No se pudieron cargar las ofertas.');
  }

  // Sends the last turns of the conversation and the neighborhood the customer gave earlier in the chat (kept in memory only).
  async chat(payload: { messages: ChatTurn[]; neighborhood?: string }): Promise<ChatResponse> {
    return (await this.request(this.http.post<{ data: ChatResponse }>(`${this.baseUrl}/assistant/chat`, payload), 'El asistente no pudo responder. Inténtalo de nuevo.')).data;
  }

  // Catalog grouped by store, without the products on offer (those are in Ofertas). One filter: the category.
  async getCatalog(category?: string): Promise<{ groups: CatalogGroup[]; total: number }> {
    const params = category ? { category } : undefined;
    const response = await this.request(this.http.get<{ data: CatalogGroup[]; total: number }>(`${this.baseUrl}/products/catalog`, { params }), 'No se pudo cargar el catálogo.');
    return { groups: response.data, total: response.total };
  }

  // Whether the email (or another address of the same mailbox, like Gmail with dots) already has an account.
  checkEmail(email: string): Promise<{ available: boolean; message?: string }> {
    return this.request(this.http.post<{ available: boolean; message?: string }>(`${this.baseUrl}/auth/check-email`, { email }), 'No se pudo revisar el correo.');
  }

  register(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    return this.request(this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/auth/register`, payload), 'No se pudo crear la cuenta.');
  }

  login(payload: { email: string; password: string }): Promise<{ token: string; user: AuthUser }> {
    return this.request(this.http.post<{ token: string; user: AuthUser }>(`${this.baseUrl}/auth/login`, payload), 'No se pudo iniciar sesión.');
  }

  forgotPassword(email: string): Promise<{ message: string }> {
    return this.request(this.http.post<{ message: string }>(`${this.baseUrl}/auth/forgot-password`, { email }), 'No se pudo enviar el enlace.');
  }

  resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request(this.http.post<{ message: string }>(`${this.baseUrl}/auth/reset-password`, { token, password }), 'No se pudo cambiar la contraseña.');
  }

  async getAccount(): Promise<AccountProfile> {
    return (await this.request(this.http.get<{ data: AccountProfile }>(`${this.baseUrl}/account`), 'No se pudo cargar tu perfil.')).data;
  }

  // In the supabase mode the answer has no token: the session token does not change.
  updateName(name: string): Promise<SessionUpdate | Omit<SessionUpdate, 'token'>> {
    return this.request(this.http.patch<SessionUpdate>(`${this.baseUrl}/account/name`, { name }), 'No se pudo actualizar el nombre.');
  }

  changePassword(currentPassword: string, newPassword: string): Promise<SessionUpdate> {
    return this.request(this.http.post<SessionUpdate>(`${this.baseUrl}/account/password`, { currentPassword, newPassword }), 'No se pudo cambiar la contraseña.');
  }

  requestEmailChange(newEmail: string, currentPassword: string): Promise<{ message: string }> {
    return this.request(this.http.post<{ message: string }>(`${this.baseUrl}/account/email`, { newEmail, currentPassword }), 'No se pudo pedir el cambio de correo.');
  }

  confirmEmailChange(token: string): Promise<{ message: string }> {
    return this.request(this.http.post<{ message: string }>(`${this.baseUrl}/account/email/confirm`, { token }), 'No se pudo confirmar el correo.');
  }

  // With a token (Supabase mode, before the session is saved) it is sent as is; otherwise the interceptor adds it.
  async me(token?: string): Promise<AuthUser> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return (await this.request(this.http.get<{ user: AuthUser }>(`${this.baseUrl}/auth/me`, { headers }), 'No se pudo validar la sesión.')).user;
  }

  async getMyStores(): Promise<{ stores: OwnedStore[]; max: number }> {
    const response = await this.request(this.http.get<{ data: OwnedStore[]; max: number }>(`${this.baseUrl}/stores/mine`), 'No se pudieron cargar tus locales.');
    return { stores: response.data, max: response.max };
  }

  createStore(store: StoreInput): Promise<{ data: OwnedStore; message: string }> {
    return this.request(this.http.post<{ data: OwnedStore; message: string }>(`${this.baseUrl}/stores`, store), 'No se pudo crear el local.');
  }

  updateStore(id: string, changes: Partial<StoreInput>): Promise<{ data: Store; message: string }> {
    return this.request(this.http.patch<{ data: Store; message: string }>(`${this.baseUrl}/stores/${id}`, changes), 'No se pudo actualizar el local.');
  }

  deleteStore(id: string): Promise<{ message: string }> {
    return this.request(this.http.delete<{ message: string }>(`${this.baseUrl}/stores/${id}`), 'No se pudo eliminar el local.');
  }

  async getMyInventory(storeId?: string): Promise<Inventory> {
    const response = await this.request(
      this.http.get<{ data: InventoryProduct[]; store: OwnedStore; stores: OwnedStore[]; today: string }>(`${this.baseUrl}/products/mine`, storeParams(storeId)),
      'No se pudieron cargar los productos de tu tienda.',
    );
    return { products: response.data, store: response.store, stores: response.stores, today: response.today };
  }

  async saveProduct(product: ProductInput, storeId?: string): Promise<Product> {
    return (await this.request(this.http.post<{ data: Product }>(`${this.baseUrl}/products`, storeId ? { ...product, storeId } : product), 'No se pudo guardar el producto.')).data;
  }

  async updateProduct(id: string, product: Partial<ProductInput>): Promise<Product> {
    return (await this.request(this.http.put<{ data: Product }>(`${this.baseUrl}/products/${id}`, product), 'No se pudo actualizar el producto.')).data;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(this.http.delete(`${this.baseUrl}/products/${id}`), 'No se pudo eliminar el producto.');
  }

  async getSuggestions(storeId?: string): Promise<DiscountSuggestion[]> {
    return (await this.request(this.http.get<{ data: DiscountSuggestion[] }>(`${this.baseUrl}/suggestions`, storeParams(storeId)), 'No se pudieron cargar las sugerencias de descuento.')).data;
  }

  // The store approves with the range it chose (by default from today until the expiration date).
  approveSuggestion(id: string, range?: OfferRange, storeId?: string): Promise<{ data: AppliedDiscount; message: string }> {
    return this.request(this.http.post<{ data: AppliedDiscount; message: string }>(`${this.baseUrl}/suggestions/${id}/approve`, range ?? {}, storeParams(storeId)), 'No se pudo aplicar el descuento.');
  }

  rejectSuggestion(id: string, storeId?: string): Promise<{ message: string }> {
    return this.request(this.http.post<{ message: string }>(`${this.baseUrl}/suggestions/${id}/reject`, {}, storeParams(storeId)), 'No se pudo descartar la sugerencia.');
  }

  approveAllSuggestions(storeId?: string): Promise<{ data: AppliedDiscount[]; message: string }> {
    return this.request(this.http.post<{ data: AppliedDiscount[]; message: string }>(`${this.baseUrl}/suggestions/approve-all`, {}, storeParams(storeId)), 'No se pudieron aplicar los descuentos.');
  }
}
