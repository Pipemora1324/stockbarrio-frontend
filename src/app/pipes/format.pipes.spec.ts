import { formatCalendarDate } from './calendar-date.pipe';
import { formatCop } from './cop-currency.pipe';

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
});
