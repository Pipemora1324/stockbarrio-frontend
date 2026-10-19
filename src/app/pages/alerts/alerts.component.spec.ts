import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import { AlertsComponent } from './alerts.component';

describe('AlertsComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getAlerts', 'getNeighborhoods', 'createAlert', 'deleteAlert']);
    api.getAlerts.and.resolveTo([]);
    api.getNeighborhoods.and.resolveTo(['Chapinero']);
    TestBed.configureTestingModule({ imports: [AlertsComponent], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
  });

  const create = () => {
    const fixture = TestBed.createComponent(AlertsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  it('requires a product or a category', () => {
    expect(create().buildPayload()).toBe('Escribe un producto o una categoría.');
  });

  it('builds a neighborhood alert without any position', () => {
    const component = create();
    component.query = ' huevos ';
    component.placeMode = 'neighborhood';
    component.neighborhood = 'Chapinero';
    component.minDiscount = 20;
    expect(component.buildPayload()).toEqual({ query: 'huevos', neighborhood: 'Chapinero', minDiscount: 20, locationConsent: false });
  });

  it('never sends a position without explicit consent', () => {
    const component = create();
    component.query = 'leche';
    component.placeMode = 'radius';
    expect(component.buildPayload()).toBe('Toma tu ubicación para crear una alerta por cercanía.');
    component.position.set({ latitude: 4.64, longitude: -74.06 });
    expect(component.buildPayload()).toMatch(/debes aceptar que guardemos tu ubicación aproximada/);
    component.locationConsent = true;
    expect(component.buildPayload()).toEqual(jasmine.objectContaining({ latitude: 4.64, longitude: -74.06, radiusKm: 2, locationConsent: true }));
  });

  it('creates the alert and reloads the list', async () => {
    const component = create();
    api.createAlert.and.resolveTo({ data: {} as never, message: 'Listo, te avisaremos cuando haya un descuento que coincida.' });
    component.category = 'Lácteos';
    await component.create();
    expect(api.createAlert).toHaveBeenCalledWith({ category: 'Lácteos', minDiscount: 0, locationConsent: false });
    expect(component.notice()).toContain('te avisaremos');
    expect(api.getAlerts).toHaveBeenCalledTimes(2);
  });
});
