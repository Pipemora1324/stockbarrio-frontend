import { Pipe, PipeTransform } from '@angular/core';

// Expiration dates are plain 'YYYY-MM-DD' days: format the text directly so no timezone can shift the day.
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
