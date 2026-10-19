import { Pipe, PipeTransform } from '@angular/core';

const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

// A missing amount shows nothing instead of "$ 0", which would look like a free product.
export const formatCop = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return '';
  const amount = Number(value);
  return Number.isFinite(amount) ? copFormatter.format(amount) : '';
};

@Pipe({ name: 'cop' })
export class CopCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return formatCop(value);
  }
}
