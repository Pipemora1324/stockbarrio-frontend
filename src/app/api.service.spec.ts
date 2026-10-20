import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError, ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const failWith = async (call: Promise<unknown>, url: string, body: string | object | null, status: number) => {
    const caught = call.then(() => null, (error: unknown) => error);
    if (status === 0) backend.expectOne(url).error(new ProgressEvent('error'), { status: 0 });
    else backend.expectOne(url).flush(body, { status, statusText: 'Error' });
    return (await caught) as ApiError;
  };

  it('turns API errors into Spanish messages with their status', async () => {
    const fromApi = await failWith(api.login({ email: 'a@b.co', password: 'x' }), '/api/auth/login', { message: 'El correo o la contraseña son incorrectos.' }, 401);
    expect(fromApi).toEqual(jasmine.any(ApiError));
    expect([fromApi.message, fromApi.status]).toEqual(['El correo o la contraseña son incorrectos.', 401]);

    const withoutMessage = await failWith(api.getSuggestions(), '/api/suggestions', '<html>Bad gateway</html>', 502);
    expect([withoutMessage.message, withoutMessage.status]).toEqual(['No se pudieron cargar las sugerencias de descuento.', 502]);

    const offline = await failWith(api.getStores(), '/api/stores', null, 0);
    expect([offline.message, offline.status]).toEqual(['No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0]);
  });

  it('has no calls for the removed alerts, notifications, flat catalog or neighborhoods', () => {
    for (const name of ['getAlerts', 'createAlert', 'getNotifications', 'getUnreadCount', 'getProducts', 'getNeighborhoods']) expect(name in api).withContext(name).toBeFalse();
  });

  it('sends offers and chat filters in the body and never any coordinates', async () => {
    const offers = api.searchOffers({ sort: 'expiring', neighborhood: 'Chapinero' });
    const offersRequest = backend.expectOne('/api/offers/search');
    expect(offersRequest.request.method).toBe('POST');
    expect(offersRequest.request.body).toEqual({ sort: 'expiring', neighborhood: 'Chapinero' });
    offersRequest.flush({ data: [], total: 0 });
    await offers;

    const chat = api.chat({ messages: [{ role: 'user', content: 'leche cerca' }], neighborhood: 'Suba' });
    const chatRequest = backend.expectOne('/api/assistant/chat');
    expect(chatRequest.request.body).toEqual({ messages: [{ role: 'user', content: 'leche cerca' }], neighborhood: 'Suba' });
    chatRequest.flush({ data: { reply: 'Hola', mode: 'rules', results: [] } });
    expect((await chat).reply).toBe('Hola');
  });

  it('no longer has calls for the store location or the combos', () => {
    expect('updateMyStoreLocation' in api).toBeFalse();
    expect('recommend' in api).toBeFalse();
  });

  it('calls every endpoint with the method, path and body the API expects', async () => {
    const cases: Array<[() => Promise<unknown>, string, string, unknown, object]> = [
      [() => api.register({ accountType: 'customer' }), 'POST', '/api/auth/register', { accountType: 'customer' }, { token: 't', user: {} }],
      [() => api.forgotPassword('ana@correo.co'), 'POST', '/api/auth/forgot-password', { email: 'ana@correo.co' }, { message: 'ok' }],
      [() => api.resetPassword('tok', 'clave12345'), 'POST', '/api/auth/reset-password', { token: 'tok', password: 'clave12345' }, { message: 'ok' }],
      [() => api.me(), 'GET', '/api/auth/me', null, { user: { id: 'u1' } }],
      [() => api.getAccount(), 'GET', '/api/account', null, { data: {} }],
      [() => api.updateName('Ana María'), 'PATCH', '/api/account/name', { name: 'Ana María' }, { token: 't', user: {} }],
      [() => api.changePassword('vieja1234', 'nueva1234'), 'POST', '/api/account/password', { currentPassword: 'vieja1234', newPassword: 'nueva1234' }, { token: 't', user: {} }],
      [() => api.requestEmailChange('n@correo.co', 'clave1234'), 'POST', '/api/account/email', { newEmail: 'n@correo.co', currentPassword: 'clave1234' }, { message: 'ok' }],
      [() => api.confirmEmailChange('tok'), 'POST', '/api/account/email/confirm', { token: 'tok' }, { message: 'ok' }],
      [() => api.getMyInventory(), 'GET', '/api/products/mine', null, { data: [], store: {} }],
      [() => api.saveProduct({ name: 'Leche', category: 'Lácteos', description: '', price: 1, stock: 1, expirationDate: '2099-01-01', discountPercent: 0, offerStartsOn: null, offerEndsOn: null }), 'POST', '/api/products', jasmine.objectContaining({ name: 'Leche', offerStartsOn: null }), { data: {} }],
      [() => api.getMyStores(), 'GET', '/api/stores/mine', null, { data: [], max: 10 }],
      [() => api.createStore({ name: 'Local Dos', neighborhood: 'Bosa', address: 'Calle 1 # 2-3', phone: '' }), 'POST', '/api/stores', { name: 'Local Dos', neighborhood: 'Bosa', address: 'Calle 1 # 2-3', phone: '' }, { data: {}, message: 'ok' }],
      [() => api.updateStore('s2', { name: 'Local Tres' }), 'PATCH', '/api/stores/s2', { name: 'Local Tres' }, { data: {}, message: 'ok' }],
      [() => api.deleteStore('s2'), 'DELETE', '/api/stores/s2', null, { message: 'ok' }],
      [() => api.updateProduct('p1', { stock: 3 }), 'PUT', '/api/products/p1', { stock: 3 }, { data: {} }],
      [() => api.deleteProduct('p1'), 'DELETE', '/api/products/p1', null, {}],
      [() => api.approveSuggestion('s1'), 'POST', '/api/suggestions/s1/approve', {}, { data: {}, message: 'ok' }],
      [() => api.approveSuggestion('s1', { offerStartsOn: '2026-10-20', offerEndsOn: '2026-10-22' }), 'POST', '/api/suggestions/s1/approve', { offerStartsOn: '2026-10-20', offerEndsOn: '2026-10-22' }, { data: {}, message: 'ok' }],
      [() => api.rejectSuggestion('s1'), 'POST', '/api/suggestions/s1/reject', {}, { message: 'ok' }],
      [() => api.approveAllSuggestions(), 'POST', '/api/suggestions/approve-all', {}, { data: [], message: 'ok' }],
      [() => api.getCategories(), 'GET', '/api/products/categories', null, { data: [] }],
    ];
    for (const [call, method, url, body, response] of cases) {
      const pending = call();
      const request = backend.expectOne(url);
      expect(request.request.method).withContext(url).toBe(method);
      if (body !== null) expect(request.request.body).withContext(url).toEqual(body);
      request.flush(response);
      await pending;
    }
  });

  it('sends the chosen store as ?storeId= and the new product with it', async () => {
    const inventory = api.getMyInventory('s2');
    const request = backend.expectOne((candidate) => candidate.url === '/api/products/mine');
    expect(request.request.params.get('storeId')).toBe('s2');
    request.flush({ data: [], store: { id: 's2' }, stores: [{ id: 's1' }, { id: 's2' }], today: '2026-10-19' });
    expect((await inventory).stores.length).toBe(2);

    const suggestions = api.getSuggestions('s2');
    const suggestionsRequest = backend.expectOne((candidate) => candidate.url === '/api/suggestions');
    expect(suggestionsRequest.request.params.get('storeId')).toBe('s2');
    suggestionsRequest.flush({ data: [] });
    await suggestions;

    const approve = api.approveAllSuggestions('s2');
    const approveRequest = backend.expectOne((candidate) => candidate.url === '/api/suggestions/approve-all');
    expect(approveRequest.request.params.get('storeId')).toBe('s2');
    approveRequest.flush({ data: [], message: 'ok' });
    await approve;

    const saved = api.saveProduct({ name: 'Leche', category: 'Lácteos', description: '', price: 1, stock: 1, expirationDate: '2099-01-01', discountPercent: 10, offerStartsOn: '2099-01-01', offerEndsOn: '2099-01-01' }, 's2');
    const saveRequest = backend.expectOne('/api/products');
    expect(saveRequest.request.body).toEqual(jasmine.objectContaining({ storeId: 's2', offerStartsOn: '2099-01-01', offerEndsOn: '2099-01-01' }));
    saveRequest.flush({ data: {} });
    await saved;
  });

  it('asks for the catalog grouped by store, with the category as the only filter', async () => {
    const all = api.getCatalog();
    const allRequest = backend.expectOne((candidate) => candidate.url === '/api/products/catalog');
    expect(allRequest.request.params.keys()).toEqual([]);
    allRequest.flush({ data: [{ store: { id: 's1' }, products: [] }], total: 0 });
    expect(await all).toEqual({ groups: [jasmine.objectContaining({ store: jasmine.objectContaining({ id: 's1' }) })], total: 0 });

    const dairy = api.getCatalog('Lácteos');
    const dairyRequest = backend.expectOne((candidate) => candidate.url === '/api/products/catalog');
    expect(dairyRequest.request.params.get('category')).toBe('Lácteos');
    dairyRequest.flush({ data: [], total: 0 });
    await dairy;
  });

  it('unwraps the data the pages use', async () => {
    const inventory = api.getMyInventory();
    backend.expectOne('/api/products/mine').flush({ data: [{ id: 'p1' }], store: { id: 's1' }, stores: [{ id: 's1' }], today: '2026-10-19' });
    expect(await inventory).toEqual(jasmine.objectContaining({ products: [jasmine.objectContaining({ id: 'p1' })], store: jasmine.objectContaining({ id: 's1' }) }));
  });
});
