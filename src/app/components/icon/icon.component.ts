import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Set propio de íconos: trazos de 24×24 con el color del texto, así funcionan en los dos temas. Sin emojis ni fuentes de íconos.
export const iconPaths = {
  tag: 'M3 12V4h8l10 10-8 8L3 12Z M7.5 7.5h.01',
  store: 'M4 10v10h16V10 M3 4h18l-1.5 6H4.5L3 4Z M9 20v-6h6v6',
  chat: 'M4 5h16v11H9l-5 4V5Z M8 10h8 M8 13h5',
  catalog: 'M4 4h7v7H4V4Z M13 4h7v7h-7V4Z M4 13h7v7H4v-7Z M13 13h7v7h-7v-7Z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M15.5 15.5 20 20',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
  calendar: 'M4 6h16v14H4V6Z M4 10h16 M8 3v4 M16 3v4',
  plus: 'M12 5v14 M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z M13 7l4 4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  check: 'M5 12.5 10 17l9-10',
  close: 'M6 6l12 12 M18 6 6 18',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0',
  logout: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
  percent: 'M6 18 18 6 M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  send: 'M4 12 20 4l-6 16-3-7-7-1Z',
  refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.5 4.5L20 16 M20 20v-4h-4',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M3 3l18 18 M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1 M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Z M10 20a2 2 0 0 0 4 0',
  box: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z M3 7.5 12 12l9-4.5 M12 12v9',
  // Categorías.
  milk: 'M9 3h6v3l2 3v12H7V9l2-3V3Z M7 13h10',
  bread: 'M5 11a4 4 0 0 1 2-7h10a4 4 0 0 1 2 7v9H5v-9Z M9 11v5 M15 11v5',
  egg: 'M12 21a6 6 0 0 0 6-6c0-5-3-11-6-11S6 10 6 15a6 6 0 0 0 6 6Z',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15 M5 19l8-8',
  meat: 'M14.5 4a5.5 5.5 0 0 1 5.5 5.5c0 4-4.5 6.5-7.5 6.5L8 20.5a2.1 2.1 0 0 1-3-3L9.5 13c0-4 2-9 5-9Z M15 9.5h.01',
  fish: 'M3 12c3-4 7-5 11-5 3 0 5 2 7 5-2 3-4 5-7 5-4 0-8-1-11-5Z M3 12 1 9 M3 12l-2 3 M16 11h.01',
  grain: 'M12 21V8 M12 8c-2-1-3-3-3-5 2 0 3 2 3 5Zm0 0c2-1 3-3 3-5-2 0-3 2-3 5Z M12 13c-2-1-3.5-3-3.5-5 2 0 3.5 2 3.5 5Zm0 0c2-1 3.5-3 3.5-5-2 0-3.5 2-3.5 5Z',
  drink: 'M7 3h10l-1.5 18h-7L7 3Z M7.5 8h9',
  soap: 'M8 9h8v12H8V9Z M10 9V6h4v3 M12 3v3 M10 14h4',
  can: 'M6 5h12v15H6V5Z M6 8h12 M6 17h12 M9 12.5h6',
  candy: 'M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z M8 12 3 9v6l5-3Z M16 12l5-3v6l-5-3Z',
  basket: 'M3 10h18l-2 10H5L3 10Z M7 10l4-6 M17 10l-4-6 M9 14v3 M15 14v3',
} as const;

export type IconName = keyof typeof iconPaths;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'icon', 'aria-hidden': 'true' },
  styles: [':host { display: inline-flex; flex: 0 0 auto; width: var(--icon-size, 1.25em); height: var(--icon-size, 1.25em); } svg { width: 100%; height: 100%; }'],
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path [attr.d]="path()" /></svg>`,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly stroke = input(2);
  protected readonly path = computed(() => iconPaths[this.name()]);
}
