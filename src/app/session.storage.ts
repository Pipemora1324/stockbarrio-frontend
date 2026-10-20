import type { AuthUser } from './models';

const tokenKey = 'stockbarrios-token';
const userKey = 'stockbarrios-user';
const roles: ReadonlyArray<AuthUser['role']> = ['admin', 'store', 'customer'];

export interface StoredSession {
  token: string;
  user: AuthUser;
}

const isAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user['id'] === 'string' && typeof user['name'] === 'string' && roles.includes(user['role'] as AuthUser['role']);
};

// localStorage puede fallar (modo privado, almacenamiento bloqueado) o tener datos dañados: eso nunca debe romper la app.
export const readSession = (): StoredSession | null => {
  try {
    const token = localStorage.getItem(tokenKey);
    const user: unknown = JSON.parse(localStorage.getItem(userKey) ?? 'null');
    if (token && isAuthUser(user)) return { token, user };
  } catch {
    // Sigue hasta borrar la sesión dañada.
  }
  clearSession();
  return null;
};

export const writeSession = (session: StoredSession): void => {
  try {
    localStorage.setItem(tokenKey, session.token);
    localStorage.setItem(userKey, JSON.stringify(session.user));
  } catch {
    // La sesión sigue en memoria para esta pestaña.
  }
};

export const clearSession = (): void => {
  try {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  } catch {
    // No hay nada más que limpiar.
  }
};
