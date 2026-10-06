import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import type { AuthUser } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly user = signal<AuthUser | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  constructor() {
    const token = localStorage.getItem('stockbarrios-token');
    const storedUser = localStorage.getItem('stockbarrios-user');
    if (token && storedUser) this.user.set(JSON.parse(storedUser) as AuthUser);
  }

  async login(email: string, password: string): Promise<void> {
    const response = await this.api.login({ email, password });
    this.saveSession(response.token, response.user);
  }

  async register(payload: Record<string, unknown>): Promise<void> {
    const response = await this.api.register(payload);
    this.saveSession(response.token, response.user);
  }

  logout(): void {
    localStorage.removeItem('stockbarrios-token');
    localStorage.removeItem('stockbarrios-user');
    this.user.set(null);
    this.router.navigate(['/']);
  }

  private saveSession(token: string, user: AuthUser): void {
    localStorage.setItem('stockbarrios-token', token);
    localStorage.setItem('stockbarrios-user', JSON.stringify(user));
    this.user.set(user);
    this.router.navigate(user.role === 'admin' ? ['/admin'] : ['/']);
  }
}
