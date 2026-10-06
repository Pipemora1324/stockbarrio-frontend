import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import type { ChatMessage, Product } from '../../models';

interface Recommendation { suggestion: string; products: Array<{ name: string; offerPrice: number; quantity: number; total: number }>; total: number; savings: number; confidence: number; }

@Component({ selector: 'app-chat', standalone: true, imports: [CommonModule, FormsModule], template: `
<main class="chat-layout"><section class="chat-panel"><div class="chat-header"><div><span class="eyebrow">Asistente de compras</span><h1>¿Qué quieres ahorrar?</h1></div><span class="ai-pill">IA local activa</span></div><div class="messages" #messageList><div class="message assistant" *ngIf="messages().length === 0">Hola, soy tu asistente. Indícame tu presupuesto y barrio para crear un combo de productos próximos a vencer.</div><div class="message" [class.user]="message.role === 'user'" *ngFor="let message of messages()">{{ message.content }}</div></div><p class="error" *ngIf="error()">{{ error() }}</p><form class="composer" (submit)="send()"><input [(ngModel)]="budget" type="number" min="1" placeholder="Presupuesto en euros"><input [(ngModel)]="neighborhood" placeholder="Barrio"><select [(ngModel)]="productIds" multiple><option *ngFor="let product of products()" [value]="product.id">{{ product.name }} · {{ product.offerPrice | currency:'EUR' }}</option></select><button class="button" type="submit" [disabled]="loading()">Crear combo</button></form></section><aside class="recommendation"><span class="eyebrow">Recomendación IA</span><h2>Combos optimizados</h2><div *ngIf="recommendation() as result"><p>{{ result.suggestion }}</p><div class="result-list"><article *ngFor="let product of result.products"><strong>{{ product.quantity }} × {{ product.name }}</strong><span>{{ product.total | currency:'EUR' }}</span></article></div><div class="totals"><span>Ahorro total</span><strong>{{ result.savings | currency:'EUR' }}</strong></div></div><div class="empty" *ngIf="!recommendation()">La recomendación aparecerá aquí.</div></aside></main>`, styleUrl: './chat.component.scss' })
export class ChatComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly messages = signal<ChatMessage[]>([]);
  readonly products = signal<Product[]>([]);
  recommendation = signal<Recommendation | null>(null);
  loading = signal(false);
  error = signal('');
  budget = '';
  neighborhood = '';
  productIds: string[] = [];
  ngOnInit() { void this.loadProducts(); }
  private async loadProducts() { this.products.set(await this.api.getProducts()); }
  async send() {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.recommend({ budget: Number(this.budget), neighborhood: this.neighborhood, productIds: this.productIds });
      this.recommendation.set(result);
      this.messages.update((items) => [...items, { id: crypto.randomUUID(), role: 'user', content: `Presupuesto ${this.budget} en ${this.neighborhood}` }, { id: crypto.randomUUID(), role: 'assistant', content: result.suggestion }]);
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo crear la recomendación.');
    } finally {
      this.loading.set(false);
    }
  }
}
