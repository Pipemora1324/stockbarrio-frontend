import { Pipe, PipeTransform } from '@angular/core';

// Meters in steps of 50 under 1 km; anything that rounds to 1000 m or more is shown in km.
export const formatDistance = (km: number | null | undefined): string => {
  if (km === null || km === undefined || !Number.isFinite(km)) return '';
  const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
  return meters < 1000 ? `a ${meters} m` : `a ${Math.max(1, km).toFixed(1).replace('.', ',')} km`;
};

@Pipe({ name: 'distance' })
export class DistancePipe implements PipeTransform {
  transform(km: number | null | undefined): string {
    return formatDistance(km);
  }
}
