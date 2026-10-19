import { TestBed } from '@angular/core/testing';
import { ApiError, ApiService } from '../../api.service';
import { ComboBuilderComponent } from './combo-builder.component';

describe('ComboBuilderComponent', () => {
  let recommend: jasmine.Spy;

  const setup = () => {
    recommend = jasmine.createSpy('recommend');
    TestBed.configureTestingModule({ imports: [ComboBuilderComponent], providers: [{ provide: ApiService, useValue: { recommend } }] });
    const fixture = TestBed.createComponent(ComboBuilderComponent);
    fixture.componentRef.setInput('neighborhoods', ['Chapinero', 'Suba']);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement };
  };

  it('lists the neighborhoods and sends the budget as a number', async () => {
    const { fixture, component, page } = setup();
    expect([...page.querySelectorAll('option')].map((option) => option.textContent)).toEqual(['Elige un barrio', 'Chapinero', 'Suba']);
    recommend.and.resolveTo({
      suggestion: 'Para Chapinero armamos un combo de 1 producto por $ 12.000 y ahorras $ 3.000.',
      products: [{ productId: 'p1', name: 'Leche entera', price: 5000, offerPrice: 4000, quantity: 3, total: 12000, expirationDate: '2026-10-20' }],
      total: 12000,
      savings: 3000,
      confidence: 0.8,
    });
    component.budget = '15000' as unknown as number;
    component.neighborhood = 'Chapinero';
    await component.build();
    fixture.detectChanges();
    expect(recommend).toHaveBeenCalledOnceWith({ budget: 15000, neighborhood: 'Chapinero', productIds: [] });
    const text = page.textContent!.replace(/\s/g, ' ');
    expect(text).toContain('3 × Leche entera');
    expect(text).toContain('Vence 20/10/2026');
    expect(text).toContain('Total$ 12.000');
    expect(text).toContain('Ahorro$ 3.000');
  });

  it('shows only the explanation when nothing fits the budget', async () => {
    const { fixture, component, page } = setup();
    recommend.and.resolveTo({ suggestion: 'No hay productos suficientes para formar un combo dentro del presupuesto indicado.', products: [], total: 0, savings: 0, confidence: 0.8 });
    component.neighborhood = 'Suba';
    await component.build();
    fixture.detectChanges();
    expect(page.querySelector('.suggestion')?.textContent).toContain('No hay productos suficientes');
    expect(page.querySelector('.result-list')).toBeNull();
    expect(page.querySelector('.totals')).toBeNull();
  });

  it('shows the API error and stops loading', async () => {
    const { fixture, component, page } = setup();
    recommend.and.rejectWith(new ApiError('El presupuesto debe ser mayor que 0.', 400));
    await component.build();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toBe('El presupuesto debe ser mayor que 0.');
    expect(component.loading()).toBeFalse();
  });
});
