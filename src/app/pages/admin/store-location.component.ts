import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import type { Store } from '../../models';
import { LocationService } from '../../services/location.service';
import * as rules from '../../validation/rules';

const isBlank = (value: unknown) => value === null || value === undefined || String(value).trim() === '';

@Component({
  selector: 'app-store-location',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './store-location.component.scss',
  template: `
<section class="location-card" aria-labelledby="location-title">
  <h2 id="location-title">Ubicación de la tienda</h2>
  <p class="muted">Con la ubicación, los clientes ven a qué distancia estás. Si estás en la tienda, usa el botón; si no, copia las coordenadas desde un mapa (clic derecho sobre tu tienda en el mapa).</p>
  <form class="location-form" (ngSubmit)="save()">
    <label>Latitud<input name="latitude" type="number" step="any" min="-4.3" max="13.6" [ngModel]="latitude()" (ngModelChange)="latitude.set($event)" placeholder="Ej. 4.6410" [attr.aria-invalid]="errors().latitude ? true : null" aria-describedby="latitude-error">
      @if (errors().latitude) { <small class="field-error" id="latitude-error">{{ errors().latitude }}</small> }</label>
    <label>Longitud<input name="longitude" type="number" step="any" min="-82" max="-66.8" [ngModel]="longitude()" (ngModelChange)="longitude.set($event)" placeholder="Ej. -74.0636" [attr.aria-invalid]="errors().longitude ? true : null" aria-describedby="longitude-error">
      @if (errors().longitude) { <small class="field-error" id="longitude-error">{{ errors().longitude }}</small> }</label>
    <div class="location-actions">
      <button class="button button-light" type="button" [disabled]="busy()" (click)="useCurrentPosition()">📍 Usar mi ubicación actual</button>
      @if (mapUrl(); as url) { <a class="map-link" [href]="url" target="_blank" rel="noopener noreferrer">Ver en el mapa</a> }
      <button class="button" type="submit" [disabled]="busy() || invalid()">{{ busy() ? 'Guardando…' : 'Guardar ubicación' }}</button>
    </div>
  </form>
  @if (message()) { <p class="alert alert-success" role="status">{{ message() }}</p> }
  @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
</section>`,
})
export class StoreLocationComponent {
  private readonly api = inject(ApiService);
  private readonly locationService = inject(LocationService);
  readonly store = input<Store | null>(null);
  readonly saved = output<Store>();
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly errors = computed(() => {
    const latitude = this.latitude();
    const longitude = this.longitude();
    // Both coordinates go together: either both are filled or both are empty.
    const onlyOne = isBlank(latitude) !== isBlank(longitude);
    return {
      latitude: rules.latitude(latitude) || (onlyOne && isBlank(latitude) ? 'Escribe también la latitud.' : ''),
      longitude: rules.longitude(longitude) || (onlyOne && isBlank(longitude) ? 'Escribe también la longitud.' : ''),
    };
  });
  readonly invalid = computed(() => rules.hasErrors(this.errors()));
  readonly mapUrl = computed(() => {
    const latitude = this.latitude();
    const longitude = this.longitude();
    if (latitude === null || longitude === null || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
  });

  constructor() {
    effect(() => {
      const store = this.store();
      this.latitude.set(store?.latitude ?? null);
      this.longitude.set(store?.longitude ?? null);
    });
  }

  async useCurrentPosition() {
    this.error.set('');
    this.message.set('');
    try {
      const position = await this.locationService.requestLocation();
      this.latitude.set(Math.round(position.latitude * 1e6) / 1e6);
      this.longitude.set(Math.round(position.longitude * 1e6) / 1e6);
      this.message.set('Ubicación tomada. Revísala en el mapa y guarda.');
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No pudimos obtener la ubicación.');
    } finally {
      // This position belongs to the store, not to a customer search session.
      this.locationService.clear();
    }
  }

  async save() {
    const latitude = this.toNumber(this.latitude());
    const longitude = this.toNumber(this.longitude());
    if ((latitude === null) !== (longitude === null)) {
      this.error.set('Escribe la latitud y la longitud, o deja las dos vacías.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const response = await this.api.updateMyStoreLocation({ latitude, longitude });
      this.message.set(response.message);
      this.saved.emit(response.data);
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo guardar la ubicación.');
    } finally {
      this.busy.set(false);
    }
  }

  private toNumber(value: number | string | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
