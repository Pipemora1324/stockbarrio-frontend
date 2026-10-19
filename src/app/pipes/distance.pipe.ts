import { Pipe, PipeTransform } from '@angular/core';

export const formatDistance = (km: number | null | undefined): string => {
  if (km === null || km === undefined || !Number.isFinite(km)) return '';
  if (km < 1) return `a ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `a ${km.toFixed(1).replace('.', ',')} km`;
};

@Pipe({ name: 'distance' })
export class DistancePipe implements PipeTransform {
  transform(km: number | null | undefined): string {
    return formatDistance(km);
  }
}
