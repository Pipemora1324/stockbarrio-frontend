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

  it('accepts only real days and uses the Bogota calendar near midnight', () => {
    const now = new Date('2026-10-18T15:00:00Z');
    expect(rules.expirationDate('2026-02-30', true, now)).toBe('La fecha no es válida.');
    expect(rules.expirationDate('2028-02-29', true, now)).toBe('');
    expect(rules.expirationDate('2027-02-29', false, now)).toBe('La fecha no es válida.');
    expect(rules.expirationDate('18/10/2026', true, now)).toContain('AAAA-MM-DD');
    // 22:00 in Bogota on the 18th is already the 19th in UTC: the 18th is still today.
    expect(rules.expirationDate('2026-10-18', true, new Date('2026-10-19T03:00:00Z'))).toBe('');
    expect(rules.expirationDate('2026-10-18', true, new Date('2026-10-19T05:00:00Z'))).toContain('en el pasado');
  });

  it('checks the limits of prices, stock and discounts exactly', () => {
    expect([rules.price(1), rules.price(10_000_000)]).toEqual(['', '']);
    expect(rules.price('')).toContain('entero');
    expect(rules.price('abc')).toContain('entero');
    expect([rules.stock(100_000), rules.stock(100_001)]).toEqual(['', 'El stock no puede superar 100.000 unidades.']);
    expect(rules.stock(2.5)).toContain('entero');
    expect([rules.discount(0), rules.discount(-1)]).toEqual(['', 'El descuento no puede ser negativo.']);
    expect(rules.discount(12.5)).toContain('entero');
  });

  it('validates neighborhoods and addresses', () => {
    expect(rules.neighborhood('Chapinero Alto')).toBe('');
    expect(rules.neighborhood("San José de Bavaria, Etapa 2-B")).toBe('');
    expect(rules.neighborhood('')).toBe('El barrio es obligatorio.');
    expect(rules.neighborhood('x')).toContain('entre 2 y 80');
    expect(rules.neighborhood('Barrio <script>')).toContain('solo puede tener');
    expect(rules.address('Calle 57 # 9-20')).toBe('');
    expect(rules.address('')).toBe('La dirección es obligatoria.');
    expect(rules.address('Cl 1')).toContain('al menos 5');
    expect(rules.address('x'.repeat(201))).toContain('como máximo 200');
  });

  it('collapses spaces before measuring names and accepts landlines of every city', () => {
    expect(rules.personName('   Ana    María   ')).toBe('');
    expect(rules.personName('     ')).toBe('El nombre es obligatorio.');
    expect(rules.storeName(' A ')).toContain('al menos 2');
    expect(rules.phone('604 444 5555')).toBe('');
    expect(rules.phone('609 444 5555')).toContain('celular colombiano');
    expect(rules.phone('+573101234567')).toBe('');
  });

  it('counts bytes for long passwords with accents, like bcrypt does', () => {
    expect(rules.password(`a1${'ñ'.repeat(34)}`)).toBe('');
    expect(rules.password(`a1${'ñ'.repeat(36)}`)).toContain('como máximo 72');
  });

  it('reports whether a form has any error', () => {
    expect(rules.hasErrors({ name: '', email: '' })).toBeFalse();
    expect(rules.hasErrors({ name: '', email: 'El correo electrónico no es válido.' })).toBeTrue();
  });
});

describe('offer range rules (same messages as the API)', () => {
  const today = '2026-10-19';

  it('starts today or later, unless the saved start of a running offer stays the same', () => {
    expect(rules.offerStart('', today)).toBe('Elige la fecha de inicio de la oferta.');
    expect(rules.offerStart(today, today)).toBe('');
    expect(rules.offerStart('2026-10-18', today)).toBe('La fecha de inicio de la oferta no puede ser anterior a hoy.');
    expect(rules.offerStart('2026-10-15', today, '2026-10-15')).toBe('');
  });

  it('ends after the start, not in the past and at the latest on the expiration day', () => {
    expect(rules.offerEnd('', today, '2026-10-25', today)).toBe('Elige la fecha de finalización de la oferta.');
    expect(rules.offerEnd('2026-10-25', today, '2026-10-25', today)).toBe('');
    expect(rules.offerEnd('2026-10-20', '2026-10-21', '2026-10-25', today)).toBe('La fecha de finalización no puede ser anterior a la fecha de inicio.');
    expect(rules.offerEnd('2026-10-18', '2026-10-10', '2026-10-25', today)).toBe('La fecha de finalización de la oferta no puede ser anterior a hoy.');
    expect(rules.offerEnd('2026-10-26', today, '2026-10-25', today)).toBe('La oferta no puede terminar después del vencimiento del producto (25/10/2026).');
  });

  it('does not allow an offer on an expired product', () => {
    expect(rules.offerOnExpired(10, '2026-10-18', today)).toContain('Un producto vencido no puede tener oferta');
    expect(rules.offerOnExpired(0, '2026-10-18', today)).toBe('');
    expect(rules.offerOnExpired(10, today, today)).toBe('');
  });
});

describe('email rules for new accounts', () => {
  it('normalizes and rejects "+" aliases only for new accounts', () => {
    expect(rules.normalizeEmail('  Ana@Correo.CO ')).toBe('ana@correo.co');
    expect(rules.normalizeEmail(null)).toBe('');
    expect(rules.newEmail('ana+x@correo.co')).toBe(rules.plusAliasMessage);
    expect(rules.newEmail('ana@correo.co')).toBe('');
    expect(rules.newEmail('no-es-correo')).toBe('El correo electrónico no es válido.');
    expect(rules.email('ana+x@correo.co')).toBe('', 'login and recovery still accept older addresses');
  });
});
