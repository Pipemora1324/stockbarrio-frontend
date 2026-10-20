// Test helper: adds calendar days to a 'YYYY-MM-DD' day, counting in UTC so no timezone moves the day.
export const addDaysTo = (day: string, amount: number) => {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
};
