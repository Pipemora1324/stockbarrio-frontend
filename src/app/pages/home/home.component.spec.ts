import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import { IllustrationComponent } from '../../components/illustration/illustration.component';
import { RevealDirective } from '../../components/reveal.directive';
import type { Offer, Store } from '../../models';
import { featuredCount, HomeComponent, homeMessage } from './home.component';

const store = (overrides: Partial<Store> = {}): Store => ({ id: 's1', name: 'Tienda La Esquina', neighborhood: 'Kennedy', address: 'Calle 1 # 2-3', phone: '', active: true, productCount: 5, offerCount: 2, ...overrides });
const offer = (id: string, discountPercent: number): Offer => ({
  productId: id, name: `Producto ${id}`, category: 'Lácteos', description: '', imageUrl: '', price: 10000, offerPrice: 10000 - discountPercent * 100, discountPercent, stock: 3,
  expirationDate: '2099-01-10', daysToExpire: 9, offerStartsOn: '2099-01-01', offerEndsOn: '2099-01-08', offerDaysLeft: 7, store: { id: 's1', name: 'Tienda La Esquina', neighborhood: 'Kennedy', address: 'Calle 1' },
});

describe('HomeComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = async () => {
    TestBed.configureTestingModule({ imports: [HomeComponent], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getStores', 'searchOffers']);
    api.getStores.and.resolveTo([store(), store({ id: 's2', name: 'Fruver Sur', offerCount: 0 })]);
    api.searchOffers.and.resolveTo({ data: ['a', 'b', 'c', 'd', 'e'].map((id, index) => offer(id, 50 - index * 10)), total: 5 });
  });

  it('opens with the message of the app and the way to the offers and the assistant', async () => {
    const { page } = await setup();
    expect(page.querySelector('.lead')?.textContent).toBe(homeMessage);
    expect(homeMessage).toBe('Ayudamos al ciudadano a encontrar el mejor producto al mejor precio y con los mejores descuentos cerca de su barrio.');
    expect(page.querySelector('.hero-actions a[href="/ofertas"]')).not.toBeNull();
    expect(page.querySelector('.hero-actions a[href="/chat"]')).not.toBeNull();
    // Ilustración propia, porque no hay ningún banner fotográfico configurado.
    expect(page.querySelector('app-illustration.illustration-stall')).not.toBeNull();
    expect(page.querySelector('.hero img')).toBeNull();
  });

  it('shows the affiliated stores, with their offers of today, linked to their group in the catalog', async () => {
    const { page } = await setup();
    const cards = [...page.querySelectorAll<HTMLAnchorElement>('.store-card')];
    expect(cards.map((card) => card.querySelector('strong')?.textContent)).toEqual(['Tienda La Esquina', 'Fruver Sur']);
    expect(cards[0].getAttribute('href')).toBe('/catalogo#local-s1');
    expect(cards[0].querySelector('.ribbon')?.textContent).toContain('2 ofertas');
    expect(cards[1].querySelector('.ribbon')).toBeNull();
    expect(cards[0].querySelector('.store-mark')?.textContent).toBe('TL');
  });

  it(`shows the ${featuredCount} biggest discounts, the first one featured`, async () => {
    const { page } = await setup();
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'discount' });
    const tags = page.querySelectorAll('.deals .price-tag');
    expect(tags.length).toBe(featuredCount);
    expect(tags[0].classList).toContain('featured');
    expect(tags[1].classList).not.toContain('featured');
  });

  it('has empty states with calls to action when there are no stores nor offers yet', async () => {
    api.getStores.and.resolveTo([]);
    api.searchOffers.and.resolveTo({ data: [], total: 0 });
    const { page } = await setup();
    const titles = [...page.querySelectorAll('.state h3')].map((title) => title.textContent);
    expect(titles).toEqual(['Aún no hay locales afiliados', 'Hoy no hay ofertas activas']);
    expect(page.querySelector('.state a[href="/register?tipo=tienda"]')).not.toBeNull();
    expect(page.querySelector('.state a[href="/catalogo"]')).not.toBeNull();
  });

  it('shows each section error with its own retry', async () => {
    api.getStores.and.rejectWith(new Error('No se pudieron cargar las tiendas.'));
    const { fixture, page } = await setup();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudieron cargar las tiendas.');
    expect(page.querySelectorAll('.deals .price-tag').length).toBe(featuredCount);
    api.getStores.and.resolveTo([store()]);
    page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelectorAll('.store-card').length).toBe(1);
  });
});

@Component({ imports: [RevealDirective], template: '<section appReveal>Hola</section>' })
class RevealHost {}

describe('RevealDirective', () => {
  it('shows the content at once when the person prefers reduced motion', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const fixture = TestBed.createComponent(RevealHost);
    fixture.detectChanges();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section')!;
    expect(section.classList).toContain('reveal');
    expect(section.classList).toContain('is-visible');
  });

  it('waits until the content enters the screen', () => {
    let notify!: IntersectionObserverCallback;
    const disconnect = jasmine.createSpy('disconnect');
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    spyOn(window as unknown as { IntersectionObserver: (callback: IntersectionObserverCallback) => unknown }, 'IntersectionObserver').and.callFake(function (callback: IntersectionObserverCallback) {
      notify = callback;
      return { observe: () => undefined, disconnect };
    });
    const fixture = TestBed.createComponent(RevealHost);
    fixture.detectChanges();
    const section = (fixture.nativeElement as HTMLElement).querySelector('section')!;
    expect(section.classList).not.toContain('is-visible');
    notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(section.classList).toContain('is-visible');
    expect(disconnect).toHaveBeenCalled();
  });
});

describe('IllustrationComponent', () => {
  it('draws decorative SVG with the palette, hidden from screen readers', () => {
    for (const name of ['stall', 'empty-basket', 'empty-store', 'empty-tag', 'chat'] as const) {
      const fixture = TestBed.createComponent(IllustrationComponent);
      fixture.componentRef.setInput('name', name);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('aria-hidden')).toBe('true');
      expect(host.querySelector('svg')).withContext(name).not.toBeNull();
      expect(host.innerHTML).not.toMatch(/<image|href="http/);
    }
  });
});
