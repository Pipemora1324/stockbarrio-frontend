import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
export const themeStorageKey = 'stockbarrio-theme';

const readSaved = (): Theme | null => {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue al sistema.
    return null;
  }
};

// Tema claro u oscuro. Por defecto sigue prefers-color-scheme; cuando la persona elige uno, se guarda.
// index.html aplica el valor guardado antes de que Angular arranque, así la página nunca parpadea en el otro tema.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  private readonly systemDark = signal(this.media?.matches ?? false);
  // La elección explícita, o null para seguir al sistema.
  readonly choice = signal<Theme | null>(readSaved());
  readonly theme = computed<Theme>(() => this.choice() ?? (this.systemDark() ? 'dark' : 'light'));

  constructor() {
    this.media?.addEventListener?.('change', (event) => this.systemDark.set(event.matches));
    this.apply(this.choice());
  }

  toggle() {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme) {
    this.choice.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // El tema cambia igual para esta visita.
    }
  }

  private apply(theme: Theme | null) {
    const root = this.document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
  }
}
