import { LocationService } from './location.service';

describe('LocationService', () => {
  const position = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } }) as GeolocationPosition;

  it('keeps the position only in memory and explains each browser error in Spanish', async () => {
    const service = new LocationService();
    const geolocation = spyOn(navigator.geolocation, 'getCurrentPosition');
    geolocation.and.callFake((success) => success(position(4.64, -74.06)));
    expect(await service.requestLocation()).toEqual({ latitude: 4.64, longitude: -74.06 });
    expect(service.location()).toEqual({ latitude: 4.64, longitude: -74.06 });
    expect(service.locating()).toBeFalse();
    expect(JSON.stringify(localStorage)).not.toContain('4.64');

    for (const [code, message] of [[1, 'No diste permiso'], [3, 'tardó demasiado'], [9, 'No pudimos saber dónde estás']] as const) {
      geolocation.and.callFake((_success, failure) => failure!({ code } as GeolocationPositionError));
      await expectAsync(service.requestLocation()).toBeRejectedWithError(new RegExp(message));
      expect(service.locating()).toBeFalse();
    }
    service.clear();
    expect(service.location()).toBeNull();
  });
});
