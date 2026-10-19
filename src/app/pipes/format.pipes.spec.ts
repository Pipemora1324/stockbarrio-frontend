import { formatCalendarDate } from './calendar-date.pipe';
import { formatCop } from './cop-currency.pipe';
import { formatDistance } from './distance.pipe';
import { daysUntil, expirationLabel } from '../dates';

describe('format pipes', () => {
  it('formats Colombian pesos without decimals', () => {
    const formatted = formatCop(18500.4).replace(/\s/g, ' ');
    expect(formatted).toBe('$ 18.500');
    expect(formatCop('4900')).toContain('4.900');
    expect(formatCop(undefined)).toBe('');
  });

  it('formats a plain calendar date without shifting the day', () => {
    expect(formatCalendarDate('2026-10-20')).toBe('20/10/2026');
    expect(formatCalendarDate('2026-10-20T00:00:00.000Z')).toBe('20/10/2026');
    expect(formatCalendarDate('')).toBe('');
  });

  it('formats large, zero and missing amounts', () => {
    expect(formatCop(10_000_000).replace(/\s/g, ' ')).toBe('$ 10.000.000');
    expect(formatCop(0).replace(/\s/g, ' ')).toBe('$ 0');
    expect(formatCop('no es un número')).toBe('');
    expect(formatCop(null)).toBe('');
    expect(formatCop('  ')).toBe('');
  });

  it('never shows "1000 m": from 975 m it switches to kilometers', () => {
    expect(formatDistance(0)).toBe('a 50 m');
    expect(formatDistance(0.974)).toBe('a 950 m');
    expect(formatDistance(0.98)).toBe('a 1,0 km');
    expect(formatDistance(1.05)).toBe('a 1,1 km');
    expect(formatDistance(Number.NaN)).toBe('');
    expect(formatDistance(undefined)).toBe('');
  });

  it('rejects dates that do not look like a calendar day', () => {
    expect(formatCalendarDate('20/10/2026')).toBe('');
    expect(formatCalendarDate(null)).toBe('');
  });
});

describe('expiration labels', () => {
  it('counts days on the Bogota calendar, also late at night', () => {
    const lateNight = new Date('2026-10-19T03:00:00Z');
    expect(daysUntil('2026-10-18', lateNight)).toBe(0);
    expect(daysUntil('2026-10-19', lateNight)).toBe(1);
    expect(daysUntil('2026-10-17', lateNight)).toBe(-1);
    expect(daysUntil('2026-11-01T00:00:00.000Z', lateNight)).toBe(14);
  });

  it('writes the label in Spanish for each case', () => {
    expect([-1, 0, 1, 5].map(expirationLabel)).toEqual(['Vencido', 'Vence hoy', 'Vence mañana', 'Vence en 5 días']);
  });
});
