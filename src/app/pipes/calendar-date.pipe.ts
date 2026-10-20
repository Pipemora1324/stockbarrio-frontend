import { Pipe, PipeTransform } from '@angular/core';

// Las fechas de vencimiento son días 'AAAA-MM-DD': se formatea el texto directamente para que ninguna zona horaria corra el día.
export const formatCalendarDate = (value: string | null | undefined): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
};

@Pipe({ name: 'calendarDate' })
export class CalendarDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatCalendarDate(value);
  }
}
