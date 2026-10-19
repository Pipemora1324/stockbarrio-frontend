import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError, ApiService } from './api.service';
import type { AuthUser } from './models';
import { clearSession, readSession, writeSession } from './session.storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = signal(readSession());
  readonly user = computed<AuthUser | null>(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly isStore = computed(() => this.user()?.role === 'store');
  readonly isCustomer = computed(() => this.user()?.role === 'customer');
  readonly sessionNotice = signal('');

  async login(email: string, password: string): Promise<void> {
    const response = await this.api.login({ email, password });
    this.saveSession(response.token, response.user);
  }

  async register(payload: Record<string, unknown>): Promise<void> {
    const response = await this.api.register(payload);
    this.saveSession(response.token, response.user);
  }

  // Checks the stored token against the API; a network failure keeps the session (the API may be waking up).
  async validateSession(): Promise<void> {
    const current = this.session();
    if (!current) return;
    try {
      const user = await this.api.me();
      if (this.session()?.token !== current.token) return;
      this.session.set({ token: current.token, user });
      writeSession({ token: current.token, user });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) this.expireSession();
    }
  }

  // Replaces the stored session after a profile change that issued a new token (name or password).
  replaceSession(token: string, user: AuthUser): void {
    writeSession({ token, user });
    this.session.set({ token, user });
  }

  // Forgets the session without leaving the current page.
  endSession(): void {
    this.clear();
  }

  // Closes the session and shows a message on the login page (after a password reset or an email change).
  signOutWithNotice(message: string): void {
    this.clear();
    this.sessionNotice.set(message);
    void this.router.navigate(['/login']);
  }

  logout(): void {
    this.clear();
    void this.router.navigate(['/']);
  }

  expireSession(): void {
    if (!this.session()) return;
    this.clear();
    this.sessionNotice.set('Tu sesión expiró. Vuelve a iniciar sesión.');
    void this.router.navigate(['/login']);
  }

  private clear(): void {
    clearSession();
    this.session.set(null);
  }

  private saveSession(token: string, user: AuthUser): void {
    writeSession({ token, user });
    this.session.set({ token, user });
    this.sessionNotice.set('');
    const home: Record<AuthUser['role'], string> = { store: '/admin', customer: '/alertas', admin: '/' };
    void this.router.navigate([home[user.role]]);
  }
}
