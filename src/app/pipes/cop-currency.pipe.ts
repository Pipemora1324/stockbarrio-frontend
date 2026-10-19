import { Pipe, PipeTransform } from '@angular/core';

const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const formatCop = (value: number | string | null | undefined): string => {
  const amount = Number(value);
  return Number.isFinite(amount) ? copFormatter.format(amount) : '';
};

@Pipe({ name: 'cop' })
export class CopCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return formatCop(value);
  }
}
