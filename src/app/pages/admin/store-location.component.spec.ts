import { TestBed } from '@angular/core/testing';
import { ApiError, ApiService } from '../../api.service';
import type { Store } from '../../models';
import { LocationService } from '../../services/location.service';
import { StoreLocationComponent } from './store-location.component';

const store: Store = { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57', phone: '', latitude: 4.641, longitude: -74.0636, active: true };

describe('StoreLocationComponent', () => {
  let updateMyStoreLocation: jasmine.Spy;

  const setup = (current: Store | null = store) => {
    updateMyStoreLocation = jasmine.createSpy('updateMyStoreLocation');
    TestBed.configureTestingModule({ imports: [StoreLocationComponent], providers: [{ provide: ApiService, useValue: { updateMyStoreLocation } }] });
    const fixture = TestBed.createComponent(StoreLocationComponent);
    fixture.componentRef.setInput('store', current);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, component: fixture.componentInstance, page, submit: () => page.querySelector<HTMLButtonElement>('button[type=submit]')! };
  };

  it('starts with the saved coordinates and links to the map', () => {
    const { component, page } = setup();
    expect([component.latitude(), component.longitude()]).toEqual([4.641, -74.0636]);
    expect(page.querySelector<HTMLAnchorElement>('.map-link')?.href).toBe('https://www.openstreetmap.org/?mlat=4.641&mlon=-74.0636#map=18/4.641/-74.0636');
  });

  it('asks for both coordinates and keeps them inside Colombia', () => {
    const { fixture, component, page, submit } = setup(null);
    expect(page.querySelector('.map-link')).toBeNull();
    component.latitude.set(4.64);
    fixture.detectChanges();
    expect(component.errors().longitude).toBe('Escribe también la longitud.');
    expect(submit().disabled).toBeTrue();
    component.longitude.set(4.64);
    fixture.detectChanges();
    expect(component.errors().longitude).toContain('dentro de Colombia');
    expect(submit().disabled).toBeTrue();
    component.longitude.set(-74.06);
    fixture.detectChanges();
    expect(submit().disabled).toBeFalse();
  });

  it('saves, tells the panel and shows the API message', async () => {
    const { component } = setup();
    const saved: Store[] = [];
    component.saved.subscribe((value) => saved.push(value));
    updateMyStoreLocation.and.resolveTo({ data: { ...store, latitude: 4.65, longitude: -74.06 }, message: 'La ubicación de la tienda se guardó correctamente.' });
    component.latitude.set(4.65);
    component.longitude.set(-74.06);
    await component.save();
    expect(updateMyStoreLocation).toHaveBeenCalledOnceWith({ latitude: 4.65, longitude: -74.06 });
    expect(saved[0].latitude).toBe(4.65);
    expect(component.message()).toBe('La ubicación de la tienda se guardó correctamente.');
    expect(component.busy()).toBeFalse();
  });

  it('can clear the location by leaving both fields empty', async () => {
    const { component } = setup();
    updateMyStoreLocation.and.resolveTo({ data: { ...store, latitude: null, longitude: null }, message: 'ok' });
    component.latitude.set('' as unknown as null);
    component.longitude.set(null);
    await component.save();
    expect(updateMyStoreLocation).toHaveBeenCalledOnceWith({ latitude: null, longitude: null });
  });

  it('shows the API error when saving fails', async () => {
    const { component } = setup();
    updateMyStoreLocation.and.rejectWith(new ApiError('Las coordenadas deben estar dentro de Colombia.', 400));
    await component.save();
    expect(component.error()).toBe('Las coordenadas deben estar dentro de Colombia.');
    expect(component.message()).toBe('');
  });

  it('rounds the current position and never keeps it as a customer location', async () => {
    const { component } = setup(null);
    const location = TestBed.inject(LocationService);
    spyOn(location, 'requestLocation').and.callFake(async () => {
      location.location.set({ latitude: 4.64123456, longitude: -74.06367891 });
      return { latitude: 4.64123456, longitude: -74.06367891 };
    });
    await component.useCurrentPosition();
    expect([component.latitude(), component.longitude()]).toEqual([4.641235, -74.063679]);
    expect(component.message()).toContain('Revísala en el mapa');
    expect(location.location()).toBeNull();
  });
});
