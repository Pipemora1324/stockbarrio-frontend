export interface Store { id: string; name: string; neighborhood: string; address: string; phone: string; latitude: number | null; longitude: number | null; active: boolean; }
export interface Product { id: string; storeId: string; storeName: string; neighborhood: string; name: string; category: string; description: string; price: number; offerPrice: number; stock: number; expirationDate: string; discountPercent: number; imageUrl: string; active: boolean; }
export interface AuthUser { id: string; name: string; email?: string; role: 'admin' | 'store' | 'customer'; storeId?: string; }
export interface DiscountSuggestion { id: string; productId: string; productName: string; category: string; price: number; stock: number; expirationDate: string; currentPercent: number; suggestedPercent: number; suggestedPrice: number; daysToExpire: number; reason: string; source: 'local' | 'ai'; }
export interface AppliedDiscount { productId: string; discountPercent: number; offerPrice: number; }
export type SearchPreference = 'relevance' | 'cheapest' | 'best_deal' | 'best_grade' | 'nearest' | 'expiring';
export interface AssistantResult { productId: string; name: string; category: string; price: number; offerPrice: number; discountPercent: number; stock: number; expirationDate: string; daysToExpire: number; distanceKm: number | null; store: { id: string; name: string; neighborhood: string; address: string }; }
export interface AssistantResponse { reply: string; intent: { terms: string[]; preference: SearchPreference; neighborhood: string | null }; origin: 'location' | 'neighborhood' | null; results: AssistantResult[]; }
export interface Coordinates { latitude: number; longitude: number; }
export interface AlertSubscription { id: string; query: string | null; category: string | null; neighborhood: string | null; latitude: number | null; longitude: number | null; radiusKm: number | null; minDiscount: number; createdAt: string; }
export interface AlertInput { query?: string; category?: string; neighborhood?: string; latitude?: number; longitude?: number; radiusKm?: number; minDiscount: number; locationConsent: boolean; }
export interface AppNotification { id: string; title: string; message: string; productId: string | null; productName?: string | null; createdAt: string; readAt: string | null; }
export type OfferSort = 'discount' | 'nearest' | 'expiring';
export interface Offer { productId: string; name: string; category: string; description: string; imageUrl: string; price: number; offerPrice: number; discountPercent: number; stock: number; expirationDate: string; daysToExpire: number; distanceKm: number | null; store: { id: string; name: string; neighborhood: string; address: string }; }
export interface OfferQuery { neighborhood?: string; category?: string; search?: string; latitude?: number; longitude?: number; radiusKm?: number; sort: OfferSort; }
