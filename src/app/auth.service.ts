import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { emailTakenMessage } from './validation/rules';
import { ApiError, ApiService } from './api.service';
import type { AuthUser } from './models';
import { SupabaseAuthFailure, SupabaseService, supabaseEnabled, toAuthFailure } from './services/supabase.service';
import { clearSession, readSession, writeSession } from './session.storage';

// already-pending: the account exists but its email is not confirmed; Supabase sent the confirmation again.
export type RegisterResult = 'signed-in' | 'confirm-email' | 'already-pending';
// A user created more than this long ago was not created by this sign up.
export const existingUserAfterMs = 10_000;

// Where Supabase sends people back after they open a confirmation link.
const backTo = (path: string) => `${globalThis.location?.origin ?? ''}${path}`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly session = signal(readSession());
  readonly user = computed<AuthUser | null>(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly isStore = computed(() => this.user()?.role === 'store');
  readonly isCustomer = computed(() => this.user()?.role === 'customer');
  readonly sessionNotice = signal('');
  readonly usesSupabase = supabaseEnabled();
  private listening = false;

  async login(email: string, password: string): Promise<void> {
    if (!this.usesSupabase) {
      const response = await this.api.login({ email, password });
      this.saveSession(response.token, response.user);
      return;
    }
    const { data, error } = await (await this.supabase.auth()).signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.session) throw toAuthFailure(error);
    await this.openSupabaseSession(data.session.access_token);
  }

  // In the supabase mode the account exists only after the person confirms the email from the link.
  async register(payload: Record<string, unknown>): Promise<RegisterResult> {
    if (!this.usesSupabase) {
      const response = await this.api.register(payload);
      this.saveSession(response.token, response.user);
      return 'signed-in';
    }
    const { email, password, ...profile } = payload as { email: string; password: string } & Record<string, unknown>;
    const { data, error } = await (await this.supabase.auth()).signUp({ email, password, options: { data: profile, emailRedirectTo: backTo('/login?confirmado=1') } });
    if (error) throw toAuthFailure(error);
    // With "Confirm email" on, Supabase answers a confirmed address with an obfuscated user without identities
    // instead of an error, so nobody can learn which emails exist from the API alone.
    if (data?.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw new SupabaseAuthFailure(emailTakenMessage, 'email_taken');
    const createdAt = data?.user?.created_at ? Date.parse(data.user.created_at) : NaN;
    if (data?.user && !data.user.email_confirmed_at && Date.now() - createdAt > existingUserAfterMs) return 'already-pending';
    return 'confirm-email';
  }

  async resendConfirmation(email: string): Promise<void> {
    const { error } = await (await this.supabase.auth()).resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: backTo('/login?confirmado=1') } });
    if (error) throw toAuthFailure(error);
  }

  // Password recovery with a 6 digit code sent by Supabase.
  async requestRecoveryCode(email: string): Promise<void> {
    const { error } = await (await this.supabase.auth()).resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw toAuthFailure(error);
  }

  async resetWithCode(email: string, code: string, password: string): Promise<void> {
    const verified = await (await this.supabase.auth()).verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'recovery' });
    if (verified.error) throw toAuthFailure(verified.error);
    const updated = await (await this.supabase.auth()).updateUser({ password });
    if (updated.error) throw toAuthFailure(updated.error);
    // Closes every session of the account, including the one the code opened.
    await (await this.supabase.auth()).signOut({ scope: 'global' }).catch(() => undefined);
  }

  // Profile changes. The name always lives in the API; the password and the email live in Supabase in that mode.
  async updateName(name: string): Promise<string> {
    const response = await this.api.updateName(name);
    if ('token' in response) this.replaceSession(response.token, response.user);
    else this.updateUser(response.user);
    return response.message;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    if (!this.usesSupabase) {
      const response = await this.api.changePassword(currentPassword, newPassword);
      this.replaceSession(response.token, response.user);
      return response.message;
    }
    await this.confirmCurrentPassword(currentPassword);
    const { error } = await (await this.supabase.auth()).updateUser({ password: newPassword });
    if (error) throw toAuthFailure(error);
    await (await this.supabase.auth()).signOut({ scope: 'others' }).catch(() => undefined);
    return 'Tu contraseña se cambió. Cerramos las demás sesiones abiertas.';
  }

  async requestEmailChange(newEmail: string, currentPassword: string): Promise<string> {
    if (!this.usesSupabase) return (await this.api.requestEmailChange(newEmail, currentPassword)).message;
    await this.confirmCurrentPassword(currentPassword);
    const { error } = await (await this.supabase.auth()).updateUser({ email: newEmail }, { emailRedirectTo: backTo('/login?correo=1') });
    if (error) throw toAuthFailure(error);
    return `Te enviamos un enlace a ${newEmail}. El correo cambiará cuando lo confirmes; si te llega también un aviso al correo actual, confírmalo ahí.`;
  }

  // Supabase does not ask for the current password, so the app checks it first by signing in again.
  private async confirmCurrentPassword(password: string) {
    const email = this.user()?.email;
    if (!email) throw new SupabaseAuthFailure('Tu sesión expiró. Vuelve a iniciar sesión.', 'session_not_found');
    const { error } = await (await this.supabase.auth()).signInWithPassword({ email, password });
    if (error) throw error.code === 'invalid_credentials' ? new SupabaseAuthFailure('La contraseña actual no es correcta.', 'invalid_credentials') : toAuthFailure(error);
  }

  // Checks the stored session against the API; a network failure keeps the session (the API may be waking up).
  async validateSession(): Promise<void> {
    if (this.usesSupabase) return this.validateSupabaseSession();
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

  // Updates the profile data and keeps the current token (the supabase mode never issues own tokens).
  updateUser(user: AuthUser): void {
    const token = this.token();
    if (token) this.replaceSession(token, user);
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

  private async openSupabaseSession(accessToken: string) {
    try {
      const user = await this.api.me(accessToken);
      this.saveSession(accessToken, user);
      void this.listenToSupabase();
    } catch (error) {
      // The token is valid for Supabase but the API refused it (unconfirmed email, profile data): leave it closed.
      await (await this.supabase.auth()).signOut({ scope: 'local' }).catch(() => undefined);
      throw error;
    }
  }

  private async validateSupabaseSession() {
    const { data } = await (await this.supabase.auth()).getSession().catch(() => ({ data: { session: null } }));
    if (!data.session) {
      if (this.session()) this.expireSession();
      return;
    }
    try {
      const user = await this.api.me(data.session.access_token);
      this.replaceSession(data.session.access_token, user);
      void this.listenToSupabase();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) this.expireSession();
    }
  }

  // supabase-js refreshes the access token before it expires: keep the copy the interceptor sends up to date.
  private async listenToSupabase() {
    if (this.listening) return;
    this.listening = true;
    (await this.supabase.auth()).onAuthStateChange((event, session) => {
      const current = this.session();
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') && session && current) this.replaceSession(session.access_token, current.user);
      if (event === 'SIGNED_OUT' && current) this.expireSession();
    });
  }

  private clear(): void {
    clearSession();
    this.session.set(null);
    if (this.usesSupabase) void this.supabase.auth().then((auth) => auth.signOut({ scope: 'local' })).catch(() => undefined);
  }

  private saveSession(token: string, user: AuthUser): void {
    writeSession({ token, user });
    this.session.set({ token, user });
    this.sessionNotice.set('');
    const home: Record<AuthUser['role'], string> = { store: '/admin', customer: environment.enableAlerts ? '/alertas' : '/ofertas', admin: '/' };
    void this.router.navigate([home[user.role]]);
  }
}
