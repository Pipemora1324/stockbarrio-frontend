export interface Store { id: string; name: string; neighborhood: string; address: string; phone: string; latitude: number; longitude: number; active: boolean; }
export interface Product { id: string; storeId: string; storeName: string; neighborhood: string; name: string; category: string; description: string; price: number; offerPrice: number; stock: number; expirationDate: string; discountPercent: number; imageUrl: string; active: boolean; }
export interface AuthUser { id: string; name: string; email?: string; role: 'admin' | 'store'; storeId?: string; }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; }
export interface DiscountSuggestion { id: string; productId: string; productName: string; category: string; price: number; stock: number; expirationDate: string; currentPercent: number; suggestedPercent: number; suggestedPrice: number; daysToExpire: number; reason: string; source: 'local' | 'ai'; }
export interface AppliedDiscount { productId: string; discountPercent: number; offerPrice: number; }
