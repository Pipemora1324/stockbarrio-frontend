import { TestBed } from '@angular/core/testing';
import { ApiError, ApiService } from '../../api.service';
import type { OwnedStore } from '../../models';
import { deleteStoreQuestion, StoresManagerComponent } from './stores-manager.component';

const store = (overrides: Partial<OwnedStore> = {}): OwnedStore => ({ id: 's1', name: 'Tienda La Esquina', neighborhood: 'Kennedy', address: 'Calle 1 # 2-3', phone: '', active: true, productCount: 4, ...overrides });

describe('StoresManagerComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = (stores: OwnedStore[] = [store(), store({ id: 's2', name: 'Local Norte' })], selectedId: string | null = 's1', max = 10) => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['createStore', 'updateStore', 'deleteStore']);
    TestBed.configureTestingModule({ imports: [StoresManagerComponent], providers: [{ provide: ApiService, useValue: api }] });
    const fixture = TestBed.createComponent(StoresManagerComponent);
    fixture.componentRef.setInput('stores', stores);
    fixture.componentRef.setInput('selectedId', selectedId);
    fixture.componentRef.setInput('max', max);
    fixture.detectChanges();
    const changes: Array<{ message: string; selectId: string | null }> = [];
    const selected: string[] = [];
    fixture.componentInstance.changed.subscribe((change) => changes.push(change));
    fixture.componentInstance.selected.subscribe((id) => selected.push(id));
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement, changes, selected };
  };
  const type = (page: HTMLElement, id: string, value: string) => {
    const input = page.querySelector<HTMLInputElement>(id)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  it('shows the stores as a radio group and emits the chosen one', () => {
    const { page, selected } = setup();
    expect(page.querySelector('.store-tabs')?.getAttribute('role')).toBe('radiogroup');
    expect([...page.querySelectorAll('.store-tab')].map((tab) => tab.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    expect(page.querySelectorAll('.store-tab')[0].textContent).toContain('4 productos');
    page.querySelectorAll<HTMLButtonElement>('.store-tab')[1].click();
    expect(selected).toEqual(['s2']);
  });

  it('creates a store with validated data and asks to select it', async () => {
    const { fixture, page, changes } = setup();
    page.querySelector<HTMLButtonElement>('.stores-head button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    page.querySelector<HTMLFormElement>('#new-store-form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(page.querySelectorAll('#new-store-form .field-error').length).toBeGreaterThan(0);
    expect(api.createStore).not.toHaveBeenCalled();

    api.createStore.and.resolveTo({ data: store({ id: 's3', name: 'Local Sur' }), message: 'El local se creó correctamente.' });
    type(page, '#store-name', 'Local Sur');
    type(page, '#store-neighborhood', 'Bosa');
    type(page, '#store-address', 'Calle 9 # 8-7');
    fixture.detectChanges();
    page.querySelector<HTMLFormElement>('#new-store-form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.createStore).toHaveBeenCalledWith({ name: 'Local Sur', neighborhood: 'Bosa', address: 'Calle 9 # 8-7', phone: '' });
    expect(changes).toEqual([{ message: 'El local se creó correctamente.', selectId: 's3' }]);
  });

  it('always shows the form when the seller has no stores', () => {
    const { page } = setup([], null);
    expect(page.querySelector('#new-store-title')?.textContent).toBe('Crea tu primer local');
    expect(page.querySelector('#new-store-form .button-light')).toBeNull();
  });

  it('renames the selected store', async () => {
    const { fixture, page, changes } = setup();
    api.updateStore.and.resolveTo({ data: store({ name: 'La Esquina 2' }), message: 'El local se actualizó correctamente.' });
    [...page.querySelectorAll<HTMLButtonElement>('.store-actions button')].find((button) => button.textContent?.includes('Renombrar'))!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    type(page, '#rename-store', '!!');
    fixture.detectChanges();
    expect(page.querySelector('#rename-error')).not.toBeNull();
    type(page, '#rename-store', 'La Esquina 2');
    fixture.detectChanges();
    page.querySelector<HTMLFormElement>('.inline-form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(api.updateStore).toHaveBeenCalledWith('s1', { name: 'La Esquina 2' });
    expect(changes[0].selectId).toBe('s1');
  });

  it('asks for confirmation before deleting and says the products stop showing', async () => {
    const { component, changes } = setup();
    const confirm = spyOn(window, 'confirm').and.returnValues(false, true);
    api.deleteStore.and.resolveTo({ message: 'Se eliminó el local «Tienda La Esquina».' });
    await component.remove(store());
    expect(api.deleteStore).not.toHaveBeenCalled();
    await component.remove(store());
    expect(confirm.calls.mostRecent().args[0]).toBe('¿Eliminar el local «Tienda La Esquina»? También se quitarán sus 4 productos de Stock Barrio (ofertas, catálogo y asistente).');
    expect(changes).toEqual([{ message: 'Se eliminó el local «Tienda La Esquina».', selectId: null }]);
  });

  it('warns that the products go away too, in singular, plural or without a count', () => {
    expect(deleteStoreQuestion(store({ productCount: 1 }))).toContain('También se quitarán su producto');
    expect(deleteStoreQuestion(store({ productCount: 0 }))).toContain('También se quitarán todos sus productos');
  });

  it('shows the API error, for example a name already taken', async () => {
    const { fixture, component, page } = setup();
    spyOn(window, 'confirm').and.returnValue(true);
    api.deleteStore.and.rejectWith(new ApiError('Este local no pertenece a tu cuenta.', 403));
    await component.remove(store());
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('Este local no pertenece a tu cuenta.');
  });

  it('hides "Nuevo local" at the maximum', () => {
    const { page } = setup([store(), store({ id: 's2' })], 's1', 2);
    expect(page.querySelector('.stores-head button')).toBeNull();
    expect(page.textContent).toContain('Llegaste al máximo de 2 locales.');
  });
});
