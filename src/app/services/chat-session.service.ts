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

// La conversación y el barrio que dio el cliente en ella. Solo en memoria: sobreviven al cambiar de página,
// pero al recargar o en otra pestaña empiezan de cero, y no se escribe nada en el almacenamiento del navegador.
@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  readonly messages = signal<ConversationMessage[]>([]);
  readonly neighborhood = signal<string | null>(null);
  private nextId = 1;

  add(message: Omit<ConversationMessage, 'id'>) {
    this.messages.update((items) => [...items, { ...message, id: this.nextId++ }]);
  }

  // La API responde con el barrio que usó; uno nuevo reemplaza al recordado.
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
