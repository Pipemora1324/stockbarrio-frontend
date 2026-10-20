// Días de calendario en America/Bogota, igual que la API trata las fechas de vencimiento.
const bogotaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });

const toUtcMidnight = (day: string) => {
  const [year, month, date] = day.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, date);
};

export const todayInBogota = (now: Date = new Date()) => bogotaDay.format(now);

export const daysUntil = (day: string, now: Date = new Date()) => Math.round((toUtcMidnight(day) - toUtcMidnight(todayInBogota(now))) / 86_400_000);

export const expirationLabel = (days: number) => {
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
};
