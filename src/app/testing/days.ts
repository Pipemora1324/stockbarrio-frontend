// Ayuda de pruebas: suma días de calendario a un día 'AAAA-MM-DD', contando en UTC para que ninguna zona horaria corra el día.
export const addDaysTo = (day: string, amount: number) => {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
};
