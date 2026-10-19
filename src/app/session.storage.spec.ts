import { clearSession, readSession, writeSession } from './session.storage';

describe('session storage', () => {
  afterEach(() => localStorage.clear());

  it('restores a valid stored session', () => {
    writeSession({ token: 'abc', user: { id: '1', name: 'Luz', role: 'store', storeId: 's1' } });
    expect(readSession()?.user.storeId).toBe('s1');
  });

  it('discards corrupted JSON instead of throwing', () => {
    localStorage.setItem('stockbarrios-token', 'abc');
    localStorage.setItem('stockbarrios-user', '{no es json');
    expect(readSession()).toBeNull();
    expect(localStorage.getItem('stockbarrios-token')).toBeNull();
  });

  it('discards a stored user with an unknown role', () => {
    localStorage.setItem('stockbarrios-token', 'abc');
    localStorage.setItem('stockbarrios-user', JSON.stringify({ id: '1', name: 'X', role: 'root' }));
    expect(readSession()).toBeNull();
  });

  it('survives a storage that throws', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    spyOn(Storage.prototype, 'removeItem').and.throwError('bloqueado');
    expect(readSession()).toBeNull();
    expect(() => clearSession()).not.toThrow();
  });
});
