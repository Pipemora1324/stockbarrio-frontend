import * as rules from './rules';

describe('validation rules', () => {
  it('validates person names', () => {
    expect(rules.personName('Luz Marina Rodríguez')).toBe('');
    expect(rules.personName("D'Angelo Peña-Ruiz")).toBe('');
    expect(rules.personName('Juan2')).toContain('solo puede tener letras');
    expect(rules.personName('A')).toContain('al menos 2');
    expect(rules.personName('x'.repeat(61))).toContain('como máximo 60');
  });

  it('validates store names', () => {
    expect(rules.storeName('Pérez & Hijos, S.A.')).toBe('');
    expect(rules.storeName('Supermercado La 14')).toBe('');
    expect(rules.storeName('1234')).toContain('al menos una letra');
    expect(rules.storeName('Tienda #1')).toContain('solo puede tener');
  });

  it('validates Colombian phones', () => {
    expect(rules.phone('')).toBe('');
    expect(rules.phone('+57 310 123 4567')).toBe('');
    expect(rules.phone('(601) 234 5678')).toBe('');
    expect(rules.phone('2101234567')).toContain('celular colombiano');
    expect(rules.phone('310123')).toContain('celular colombiano');
  });

  it('validates emails and passwords', () => {
    expect(rules.email('luz@ejemplo.co')).toBe('');
    expect(rules.email('luz@ejemplo')).toContain('no es válido');
    expect(rules.password('tienda12345')).toBe('');
    expect(rules.password('corta1')).toContain('al menos 8');
    expect(rules.password('sololetras')).toContain('un número');
    expect(rules.password('12345678')).toContain('una letra');
    expect(rules.password('luz2026@x.co', 'LUZ2026@x.co')).toContain('igual a tu correo');
    expect(rules.password(`a1${'x'.repeat(71)}`)).toContain('como máximo 72');
  });

  it('validates product fields', () => {
    expect(rules.productName('Huevos AA x 30')).toBe('');
    expect(rules.productName('123')).toContain('al menos una letra');
    expect(rules.category('Lácteos')).toBe('');
    expect(rules.category('Juguetes')).toContain('de la lista');
    expect(rules.price(4900)).toBe('');
    expect(rules.price(49.5)).toContain('entero');
    expect(rules.price(0)).toContain('mayor que 0');
    expect(rules.price(10_000_001)).toContain('10.000.000');
    expect(rules.stock(0)).toBe('');
    expect(rules.stock(-1)).toContain('negativo');
    expect(rules.discount(90)).toBe('');
    expect(rules.discount(91)).toContain('90 %');
  });

  it('rejects past expiration dates only when creating', () => {
    const now = new Date('2026-10-18T15:00:00Z');
    expect(rules.expirationDate('2026-10-18', true, now)).toBe('');
    expect(rules.expirationDate('2026-10-17', true, now)).toContain('en el pasado');
    expect(rules.expirationDate('2026-10-17', false, now)).toBe('');
    expect(rules.expirationDate('', true, now)).toContain('obligatoria');
  });

  it('keeps coordinates inside Colombia', () => {
    expect(rules.latitude(4.64)).toBe('');
    expect(rules.latitude(-74.06)).toContain('dentro de Colombia');
    expect(rules.longitude(-74.06)).toBe('');
    expect(rules.longitude(4.64)).toContain('dentro de Colombia');
    expect(rules.latitude('')).toBe('');
  });
});
