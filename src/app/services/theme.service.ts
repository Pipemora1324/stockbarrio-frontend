import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
export const themeStorageKey = 'stockbarrio-theme';

const readSaved = (): Theme | null => {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // Private mode or blocked storage: follow the system.
    return null;
  }
};

// Light or dark theme. By default it follows prefers-color-scheme; once the person picks one it is saved.
// index.html applies the saved value before Angular starts, so the page never flashes in the other theme.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  private readonly systemDark = signal(this.media?.matches ?? false);
  // The explicit choice, or null to follow the system.
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
      // The theme still changes for this visit.
    }
  }

  private apply(theme: Theme | null) {
    const root = this.document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
  }
}
