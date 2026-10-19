import type { AuthUser } from './models';

const tokenKey = 'stockbarrios-token';
const userKey = 'stockbarrios-user';
const roles: ReadonlyArray<AuthUser['role']> = ['admin', 'store'];

export interface StoredSession {
  token: string;
  user: AuthUser;
}

const isAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user['id'] === 'string' && typeof user['name'] === 'string' && roles.includes(user['role'] as AuthUser['role']);
};

// localStorage can throw (private mode, blocked storage) or hold corrupted data: never let that break the app.
export const readSession = (): StoredSession | null => {
  try {
    const token = localStorage.getItem(tokenKey);
    const user: unknown = JSON.parse(localStorage.getItem(userKey) ?? 'null');
    if (token && isAuthUser(user)) return { token, user };
  } catch {
    // Falls through to clearing the broken session.
  }
  clearSession();
  return null;
};

export const writeSession = (session: StoredSession): void => {
  try {
    localStorage.setItem(tokenKey, session.token);
    localStorage.setItem(userKey, JSON.stringify(session.user));
  } catch {
    // The session still lives in memory for this tab.
  }
};

export const clearSession = (): void => {
  try {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  } catch {
    // Nothing else to clean.
  }
};
