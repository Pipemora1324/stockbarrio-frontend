import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { daysUntil, expirationLabel } from '../../dates';
import type { Product } from '../../models';
import { HeaderComponent } from '../header/header.component';
import { iconForCategory } from './category-icon';
import { ProductCardComponent } from './product-card.component';

const product: Product = {
  id: 'p1', storeId: 's1', storeName: 'Tienda Doña Luz', neighborhood: 'Chapinero', name: 'Huevos AA x 30', category: 'Huevos', description: '',
  price: 18500, offerPrice: 12950, stock: 10, expirationDate: '2099-01-01', discountPercent: 30, imageUrl: '', active: true,
};

describe('iconForCategory', () => {
  it('picks an icon by category keywords, with or without accents', () => {
    expect(iconForCategory('Huevos').icon).toBe('🥚');
    expect(iconForCategory('Lácteos').icon).toBe('🥛');
    expect(iconForCategory('Frutas y verduras').icon).toBe('🥬');
    expect(iconForCategory('Algo raro').icon).toBe('🛒');
  });
});

describe('expiration dates', () => {
  it('counts days in Bogota time', () => {
    const lateNightInBogota = new Date('2026-10-19T03:30:00Z');
    expect(daysUntil('2026-10-19', lateNightInBogota)).toBe(1);
    expect(expirationLabel(0)).toBe('Vence hoy');
    expect(expirationLabel(1)).toBe('Vence mañana');
    expect(expirationLabel(-2)).toBe('Vencido');
  });
});

describe('ProductCardComponent', () => {
  const render = (overrides: Partial<Product> = {}) => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', { ...product, ...overrides });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the category icon, discount and both prices', () => {
    const element = render();
    expect(element.querySelector('.icon')?.textContent).toContain('🥚');
    expect(element.querySelector('.badge')?.textContent).toContain('-30%');
    expect(element.textContent).toContain('12.950');
    expect(element.querySelector('s')?.textContent).toContain('18.500');
  });

  it('uses a lazy image with alt text when the product has one', () => {
    const image = render({ imageUrl: 'https://example.com/huevos.jpg' }).querySelector('img');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('alt')).toBe('Huevos AA x 30');
  });
});

describe('HeaderComponent', () => {
  it('opens and closes the mobile menu with an accessible toggle', () => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HeaderComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.menu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
