import { TestBed } from '@angular/core/testing';
import { themeStorageKey, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  afterEach(() => {
    localStorage.removeItem(themeStorageKey);
    root.removeAttribute('data-theme');
  });

  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(ThemeService);
  };

  it('follows the system preference while the person has not chosen', () => {
    const theme = create();
    const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
    expect(theme.choice()).toBeNull();
    expect(theme.theme()).toBe(systemDark ? 'dark' : 'light');
    expect(root.hasAttribute('data-theme')).toBeFalse();
  });

  it('saves the choice, applies it to the page and keeps it for the next visit', () => {
    const theme = create();
    theme.set('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(themeStorageKey)).toBe('dark');
    expect(create().theme()).toBe('dark');
  });

  it('toggles between light and dark', () => {
    const theme = create();
    theme.set('light');
    theme.toggle();
    expect(theme.theme()).toBe('dark');
    theme.toggle();
    expect(theme.theme()).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('ignores a broken saved value', () => {
    localStorage.setItem(themeStorageKey, 'morado');
    expect(create().choice()).toBeNull();
  });

  it('still works when the browser blocks the storage', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
    const theme = create();
    expect(theme.choice()).toBeNull();
    expect(() => theme.set('dark')).not.toThrow();
    expect(theme.theme()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});

// La paleta debe mantener al menos WCAG AA (4,5:1) para texto normal, en los dos temas.
describe('theme colors', () => {
  const root = document.documentElement;
  const toRgb = (value: string) => {
    const hex = value.trim().replace('#', '');
    return [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  };
  const luminance = (value: string) => {
    const [red, green, blue] = toRgb(value).map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const contrast = (first: string, second: string) => {
    const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
  };
  const token = (name: string) => getComputedStyle(root).getPropertyValue(name);
  const pairs: Array<[string, string]> = [
    ['--color-ink', '--color-bg'],
    ['--color-text', '--color-bg'],
    ['--color-text', '--color-surface'],
    ['--color-muted', '--color-bg'],
    ['--color-muted', '--color-surface'],
    ['--color-muted', '--color-surface-2'],
    ['--color-muted', '--color-corn-soft'],
    ['--color-primary-text', '--color-bg'],
    ['--color-primary-text', '--color-surface'],
    ['--color-primary-text', '--color-corn-soft'],
    ['--color-on-primary', '--color-primary'],
    ['--color-on-corn', '--color-corn'],
    ['--color-ink', '--color-corn-soft'],
    ['--color-blue', '--color-blue-soft'],
    ['--color-danger', '--color-danger-soft'],
    ['--color-bg', '--color-ink'],
  ];

  afterEach(() => root.removeAttribute('data-theme'));

  for (const theme of ['light', 'dark']) {
    it(`meets AA contrast in the ${theme} theme`, () => {
      root.setAttribute('data-theme', theme);
      expect(token('--color-bg').trim()).not.toBe('');
      for (const [text, background] of pairs) {
        expect(contrast(token(text), token(background))).withContext(`${theme}: ${text} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('changes the colors between themes and never uses green as the main color', () => {
    root.setAttribute('data-theme', 'light');
    const light = token('--color-bg');
    const primary = toRgb(token('--color-primary'));
    root.setAttribute('data-theme', 'dark');
    expect(token('--color-bg')).not.toBe(light);
    expect(primary[1]).toBeLessThan(primary[0]);
  });
});
