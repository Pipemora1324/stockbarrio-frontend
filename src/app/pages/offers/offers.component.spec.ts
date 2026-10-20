import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { CategoryFilterComponent } from '../../components/category-filter/category-filter.component';
import type { Offer, Product } from '../../models';
import { featuredMinPercent, maxFeatured, OffersComponent, splitFeatured, toCardProduct } from './offers.component';

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  productId: 'p1', name: 'Leche entera 1 L', category: 'Lácteos', description: '', imageUrl: '', price: 4900, offerPrice: 2940, discountPercent: 40, stock: 24,
  expirationDate: '2099-01-10', daysToExpire: 2, offerStartsOn: '2099-01-01', offerEndsOn: '2099-01-05', offerDaysLeft: 4,
  store: { id: 's1', name: 'Tienda La Esquina', neighborhood: 'Kennedy', address: 'Calle 57' }, ...overrides,
});

describe('splitFeatured', () => {
  const card = (percent: number, id = String(percent)) => ({ ...toCardProduct(offer()), id, discountPercent: percent }) as Product;

  it(`highlights at most ${maxFeatured} of the biggest discounts, from ${featuredMinPercent} %`, () => {
    const { featured, rest } = splitFeatured([card(60), card(50), card(40), card(35), card(10)]);
    expect(featured.map((item) => item.discountPercent)).toEqual([60, 50, 40]);
    expect(rest.map((item) => item.discountPercent)).toEqual([35, 10]);
  });

  it('does not highlight small discounts', () => {
    const { featured, rest } = splitFeatured([card(25), card(10)]);
    expect(featured).toEqual([]);
    expect(rest.length).toBe(2);
    expect(splitFeatured([])).toEqual({ featured: [], rest: [] });
  });
});

describe('OffersComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = async (params: Record<string, string> = {}, offers: Offer[] = [offer()]) => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['searchOffers', 'getCategories']);
    api.searchOffers.and.resolveTo({ data: offers, total: offers.length });
    api.getCategories.and.resolveTo(['Lácteos', 'Panadería']);
    TestBed.configureTestingModule({
      imports: [OffersComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } }],
    });
    const fixture = TestBed.createComponent(OffersComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  it('asks for the biggest discount first and reads the category from the address', async () => {
    const { page } = await setup({ categoria: 'Lácteos' });
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'discount', category: 'Lácteos' });
    expect(page.querySelector('#offers-count')?.textContent).toContain('1 oferta activa en Lácteos');
    expect(page.querySelector<HTMLInputElement>('input[value="Lácteos"]')?.checked).toBeTrue();
  });

  it('has a single filter, by category: no neighborhood, search box nor sort', async () => {
    const { page } = await setup();
    expect(page.querySelectorAll('app-category-filter').length).toBe(1);
    expect(page.querySelectorAll('select').length).toBe(0);
    expect(page.querySelector('input[type=search]')).toBeNull();
    expect([...page.querySelectorAll('.pill span')].map((pill) => pill.textContent)).toEqual(['Todas', 'Lácteos', 'Panadería']);
  });

  it('filters when a category is chosen and keeps it in the address', async () => {
    const { fixture, page } = await setup();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    page.querySelector<HTMLInputElement>('input[value="Panadería"]')!.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'discount', category: 'Panadería' });
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { categoria: 'Panadería' } }));
  });

  it('makes the biggest discounts stand out and says until when each offer lasts', async () => {
    const { page } = await setup({}, [offer({ productId: 'a', discountPercent: 60 }), offer({ productId: 'b', discountPercent: 15, name: 'Pan tajado' })]);
    const featured = page.querySelectorAll('.featured-grid .price-tag.featured');
    expect(featured.length).toBe(1);
    expect(featured[0].querySelector('.ribbon')?.textContent?.trim()).toBe('-60%');
    expect(page.textContent).toContain('Los más rebajados');
    expect(page.textContent).toContain('Oferta hasta el 05/01');
  });

  it('shows a clear empty state with calls to action', async () => {
    const { page } = await setup({}, []);
    expect(page.querySelector('.state h3')?.textContent).toBe('Hoy no hay ofertas activas');
    expect(page.querySelector('.state a[href="/catalogo"]')).not.toBeNull();
  });

  it('offers to see every category when one has no offers', async () => {
    const { fixture, page } = await setup({ categoria: 'Panadería' }, []);
    expect(page.querySelector('.state h3')?.textContent).toBe('No hay ofertas de Panadería hoy');
    api.searchOffers.and.resolveTo({ data: [offer()], total: 1 });
    page.querySelector<HTMLButtonElement>('.state button')!.click();
    await fixture.whenStable();
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'discount' });
  });

  it('shows the error with a retry button', async () => {
    const { fixture } = await setup();
    api.searchOffers.and.rejectWith(new Error('No se pudieron cargar las ofertas.'));
    await fixture.componentInstance.search();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudieron cargar las ofertas.');
    api.searchOffers.and.resolveTo({ data: [offer()], total: 1 });
    page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')).toBeNull();
  });

  it('ignores an older search that answers after a newer one', async () => {
    const { fixture } = await setup();
    let answerOld!: (value: { data: Offer[]; total: number }) => void;
    api.searchOffers.and.returnValues(new Promise((resolve) => (answerOld = resolve)), Promise.resolve({ data: [], total: 0 }));
    const component = fixture.componentInstance;
    const older = component.search();
    await component.search();
    answerOld({ data: [offer()], total: 1 });
    await older;
    expect(component.offers()).toEqual([]);
  });

  it('maps an offer to a product card with its offer dates', () => {
    expect(toCardProduct(offer())).toEqual(jasmine.objectContaining({ id: 'p1', storeName: 'Tienda La Esquina', offerPrice: 2940, offerEndsOn: '2099-01-05' }));
  });
});

describe('CategoryFilterComponent', () => {
  it('uses radio buttons with a legend and emits the chosen category', () => {
    const fixture = TestBed.createComponent(CategoryFilterComponent);
    fixture.componentRef.setInput('categories', ['Aseo']);
    fixture.componentRef.setInput('value', 'Aseo');
    fixture.componentRef.setInput('label', 'Filtrar por categoría');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('legend')?.textContent).toBe('Filtrar por categoría');
    const radios = [...page.querySelectorAll<HTMLInputElement>('input[type=radio]')];
    expect(radios.map((radio) => radio.checked)).toEqual([false, true]);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    const chosen: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => chosen.push(value));
    radios[0].dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['']);
  });
});
