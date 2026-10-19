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
    expect(component.buildPayload()).toEqual({ query: 'huevos', neighborhood: 'Chapinero', minDiscount: 20 });
  });

  it('asks for the neighborhood and offers no way to share a position', () => {
    const fixture = TestBed.createComponent(AlertsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.query = 'leche';
    component.placeMode = 'neighborhood';
    expect(component.buildPayload()).toBe('Elige el barrio de la alerta.');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toMatch(/ubicación|Cerca de donde estoy|km/);
  });

  it('creates the alert and reloads the list', async () => {
    const component = create();
    api.createAlert.and.resolveTo({ data: {} as never, message: 'Listo, te avisaremos cuando haya un descuento que coincida.' });
    component.category = 'Lácteos';
    await component.create();
    expect(api.createAlert).toHaveBeenCalledWith({ category: 'Lácteos', minDiscount: 0 });
    expect(component.notice()).toContain('te avisaremos');
    expect(api.getAlerts).toHaveBeenCalledTimes(2);
  });
});
