export interface Store { id: string; name: string; neighborhood: string; address: string; phone: string; active: boolean; productCount?: number; offerCount?: number; }
// One store of the signed-in seller (several per account).
export interface OwnedStore extends Store { productCount: number; }
export interface StoreInput { name: string; neighborhood: string; address: string; phone: string; }
export interface Product { id: string; storeId: string; storeName: string; neighborhood: string; name: string; category: string; description: string; price: number; offerPrice: number; stock: number; expirationDate: string; discountPercent: number; imageUrl: string; active: boolean; offerStartsOn?: string | null; offerEndsOn?: string | null; }
// none: no discount; scheduled: starts later; active: visible today; ended: its last day already passed.
export type OfferStatus = 'none' | 'scheduled' | 'active' | 'ended';
// A product as its store sees it in the panel.
export interface InventoryProduct extends Product { offerStatus: OfferStatus; expired: boolean; }
export interface CatalogGroup { store: { id: string; name: string; neighborhood: string; address: string; phone: string }; products: Product[]; }
export interface AuthUser { id: string; name: string; email?: string; role: 'admin' | 'store' | 'customer'; storeId?: string; }
export interface DiscountSuggestion { id: string; productId: string; productName: string; category: string; price: number; stock: number; expirationDate: string; currentPercent: number; suggestedPercent: number; suggestedPrice: number; daysToExpire: number; reason: string; source: 'local' | 'ai'; proposedStartsOn: string; proposedEndsOn: string; }
export interface AppliedDiscount { productId: string; discountPercent: number; offerPrice: number; offerStartsOn: string; offerEndsOn: string; }
export type SearchPreference = 'relevance' | 'cheapest' | 'best_deal' | 'best_grade' | 'expiring';
export interface AssistantResult { productId: string; name: string; category: string; price: number; offerPrice: number; discountPercent: number; stock: number; expirationDate: string; daysToExpire: number; store: { id: string; name: string; neighborhood: string; address: string }; }
export interface AlertSubscription { id: string; query: string | null; category: string | null; neighborhood: string | null; minDiscount: number; createdAt: string; }
export interface AlertInput { query?: string; category?: string; neighborhood?: string; minDiscount: number; }
export interface AppNotification { id: string; title: string; message: string; productId: string | null; productName?: string | null; createdAt: string; readAt: string | null; }
export type OfferSort = 'discount' | 'expiring';
export interface Offer { productId: string; name: string; category: string; description: string; imageUrl: string; price: number; offerPrice: number; discountPercent: number; stock: number; expirationDate: string; daysToExpire: number; offerStartsOn: string; offerEndsOn: string; offerDaysLeft: number; store: { id: string; name: string; neighborhood: string; address: string }; }
export interface OfferQuery { neighborhood?: string; category?: string; search?: string; sort: OfferSort; }
// rules: clear match answered without AI; ai: the model helped; basic: AI unavailable or over its limits.
export type ChatMode = 'ai' | 'rules' | 'basic';
export interface ChatTurn { role: 'user' | 'assistant'; content: string; }
export interface ChatResponse { reply: string; mode: ChatMode; intent: { product: string | null; terms: string[]; category: string | null; preference: SearchPreference; neighborhood: string | null; budget: number | null }; results: AssistantResult[]; stores?: ChatStore[]; }
export interface ChatStore { id: string; name: string; neighborhood: string; address: string; offerCount: number; }
export interface AccountProfile extends AuthUser { email: string; pendingEmail: string | null; }
export interface SessionUpdate { token: string; user: AuthUser; message: string; }
