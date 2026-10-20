import { TestBed } from '@angular/core/testing';
import { addDaysTo } from '../../testing/days';
import { daysUntil, expirationLabel, todayInBogota } from '../../dates';
import type { Product } from '../../models';
import { iconPaths } from '../icon/icon.component';
import { iconForCategory } from './category-icon';
import { offerUntilLabel, ProductCardComponent } from './product-card.component';

const today = todayInBogota();
const product: Product = {
  id: 'p1', storeId: 's1', storeName: 'Tienda La Esquina', neighborhood: 'Kennedy', name: 'Huevos AA x 30', category: 'Huevos', description: '',
  price: 18500, offerPrice: 12950, stock: 10, expirationDate: addDaysTo(today, 9), discountPercent: 30, imageUrl: '', active: true,
  offerStartsOn: today, offerEndsOn: addDaysTo(today, 5),
};

describe('iconForCategory', () => {
  it('picks an own SVG icon and a palette tone by category keywords, with or without accents', () => {
    expect(iconForCategory('Huevos')).toEqual({ icon: 'egg', tone: 'corn' });
    expect(iconForCategory('Lácteos').icon).toBe('milk');
    expect(iconForCategory('lacteos').icon).toBe('milk');
    expect(iconForCategory('Frutas y verduras').icon).toBe('leaf');
    expect(iconForCategory('Pescados y mariscos').icon).toBe('fish');
    expect(iconForCategory('Despensa').icon).toBe('can');
    expect(iconForCategory('Algo raro')).toEqual({ icon: 'basket', tone: 'cream' });
    expect(iconForCategory(null).icon).toBe('basket');
  });

  it('only uses icons that exist in the set, never emoji', () => {
    for (const category of ['Huevos', 'Lácteos', 'Panadería', 'Carnes', 'Comidas preparadas', 'Granos', 'Bebidas', 'Aseo', 'Snacks y dulces', 'Despensa', 'Otro']) {
      const { icon } = iconForCategory(category);
      expect(iconPaths[icon]).withContext(category).toBeTruthy();
      expect(icon).not.toMatch(/\p{Extended_Pictographic}/u);
    }
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

  it('says until when an offer lasts', () => {
    expect(offerUntilLabel('2026-10-19', 0)).toBe('Oferta solo por hoy');
    expect(offerUntilLabel('2026-10-20', 1)).toBe('Oferta hasta mañana');
    expect(offerUntilLabel('2026-10-24', 5)).toBe('Oferta hasta el 24/10');
  });
});

describe('ProductCardComponent', () => {
  const render = (overrides: Partial<Product> = {}, inputs: Record<string, unknown> = {}) => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', { ...product, ...overrides });
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows an offer as a price tag with the ribbon, both prices and until when it lasts', () => {
    const element = render();
    expect(element.querySelector('.price-tag')).not.toBeNull();
    expect(element.querySelector('.ribbon')?.textContent?.trim()).toBe('-30%');
    expect(element.querySelector('.ribbon')?.getAttribute('aria-label')).toBe('30 % de descuento');
    expect(element.querySelector('.price strong')?.textContent).toContain('12.950');
    expect(element.querySelector('s')?.textContent).toContain('18.500');
    const [, month, day] = product.offerEndsOn!.split('-');
    expect(element.querySelector('.until')?.textContent?.trim()).toBe(`Oferta hasta el ${day}/${month}`);
    expect(element.querySelector('.stamp')?.getAttribute('data-tone')).toBe('corn');
    expect(element.querySelector('img')).toBeNull();
  });

  it('shows a product without offer at its normal price with its expiration', () => {
    const element = render({ discountPercent: 0, offerPrice: 18500, offerStartsOn: null, offerEndsOn: null, expirationDate: today });
    expect(element.querySelector('.ribbon')).toBeNull();
    expect(element.querySelector('s')).toBeNull();
    expect(element.querySelector('.meta')?.textContent).toContain('Vence hoy');
    expect(element.querySelector('.urgent')).not.toBeNull();
  });

  it('marks the featured offers, hides the store inside the catalog groups and says when it is sold out', () => {
    expect(render({}, { featured: true }).querySelector('.price-tag.featured')).not.toBeNull();
    expect(render({}, { showStore: false }).querySelector('.store')).toBeNull();
    expect(render({ stock: 0 }).querySelector('.stock')?.textContent).toBe('Agotado');
  });
});
