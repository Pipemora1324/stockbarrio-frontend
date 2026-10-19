import { Injectable, signal } from '@angular/core';
import type { Coordinates } from '../models';

const permissionMessages: Record<number, string> = {
  1: 'No diste permiso para usar tu ubicación. Puedes elegir tu barrio en su lugar.',
  2: 'No pudimos saber dónde estás. Revisa que la ubicación del dispositivo esté activa o elige tu barrio.',
  3: 'Tu ubicación tardó demasiado. Inténtalo otra vez o elige tu barrio.',
};

// Keeps the customer's position only in memory for this tab: it is never saved in localStorage or sent to be stored.
@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly location = signal<Coordinates | null>(null);
  readonly locating = signal(false);

  get supported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  // Only call this from an explicit user action (a button), so the browser asks for permission in context.
  requestLocation(): Promise<Coordinates> {
    if (!this.supported) return Promise.reject(new Error('Tu navegador no permite compartir la ubicación. Elige tu barrio en su lugar.'));
    this.locating.set(true);
    return new Promise<Coordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          this.location.set(coordinates);
          this.locating.set(false);
          resolve(coordinates);
        },
        (error) => {
          this.locating.set(false);
          reject(new Error(permissionMessages[error.code] ?? permissionMessages[2]));
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    });
  }

  clear(): void {
    this.location.set(null);
  }
}
