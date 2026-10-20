import { Injectable, signal } from '@angular/core';
import type { AssistantResult, ChatMode, ChatStore } from '../models';

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  results?: AssistantResult[];
  stores?: ChatStore[];
  mode?: ChatMode;
  isError?: boolean;
}

// The conversation and the neighborhood the customer gave in it. Only in memory: they survive moving between
// pages, but a reload or a new tab starts over, and nothing is written to the browser storage.
@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  readonly messages = signal<ConversationMessage[]>([]);
  readonly neighborhood = signal<string | null>(null);
  private nextId = 1;

  add(message: Omit<ConversationMessage, 'id'>) {
    this.messages.update((items) => [...items, { ...message, id: this.nextId++ }]);
  }

  // The API answers with the neighborhood it used; a new one replaces the remembered one.
  remember(neighborhood: string | null) {
    if (neighborhood) this.neighborhood.set(neighborhood);
  }

  forgetNeighborhood() {
    this.neighborhood.set(null);
  }

  reset() {
    this.messages.set([]);
    this.neighborhood.set(null);
  }
}
