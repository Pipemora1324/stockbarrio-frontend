import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { emailTakenMessage } from './validation/rules';
import { ApiError, ApiService } from './api.service';
import type { AuthUser } from './models';
import { SupabaseAuthFailure, SupabaseService, supabaseEnabled, toAuthFailure } from './services/supabase.service';
import { clearSession, readSession, writeSession } from './session.storage';

// already-pending: la cuenta existe, pero su correo no está confirmado; Supabase volvió a enviar la confirmación.
export type RegisterResult = 'signed-in' | 'confirm-email' | 'already-pending';
// Un usuario creado hace más de este tiempo no lo creó este registro.
export const existingUserAfterMs = 10_000;

// A dónde devuelve Supabase a las personas después de abrir un enlace de confirmación.
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

  // En el modo supabase la cuenta solo existe cuando la persona confirma el correo desde el enlace.
  async register(payload: Record<string, unknown>): Promise<RegisterResult> {
    if (!this.usesSupabase) {
      const response = await this.api.register(payload);
      this.saveSession(response.token, response.user);
      return 'signed-in';
    }
    const { email, password, ...profile } = payload as { email: string; password: string } & Record<string, unknown>;
    const { data, error } = await (await this.supabase.auth()).signUp({ email, password, options: { data: profile, emailRedirectTo: backTo('/login?confirmado=1') } });
    if (error) throw toAuthFailure(error);
    // Con "Confirm email" activo, Supabase responde a una dirección ya confirmada con un usuario ofuscado sin identities
    // en vez de un error, para que nadie pueda saber qué correos existen solo con la API.
    if (data?.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw new SupabaseAuthFailure(emailTakenMessage, 'email_taken');
    const createdAt = data?.user?.created_at ? Date.parse(data.user.created_at) : NaN;
    if (data?.user && !data.user.email_confirmed_at && Date.now() - createdAt > existingUserAfterMs) return 'already-pending';
    return 'confirm-email';
  }

  async resendConfirmation(email: string): Promise<void> {
    const { error } = await (await this.supabase.auth()).resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: backTo('/login?confirmado=1') } });
    if (error) throw toAuthFailure(error);
  }

  // Recuperación de la contraseña con un código de 6 dígitos que envía Supabase.
  async requestRecoveryCode(email: string): Promise<void> {
    const { error } = await (await this.supabase.auth()).resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw toAuthFailure(error);
  }

  async resetWithCode(email: string, code: string, password: string): Promise<void> {
    const verified = await (await this.supabase.auth()).verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'recovery' });
    if (verified.error) throw toAuthFailure(verified.error);
    const updated = await (await this.supabase.auth()).updateUser({ password });
    if (updated.error) throw toAuthFailure(updated.error);
    // Cierra todas las sesiones de la cuenta, incluida la que abrió el código.
    await (await this.supabase.auth()).signOut({ scope: 'global' }).catch(() => undefined);
  }

  // Cambios del perfil. El nombre siempre vive en la API; la contraseña y el correo viven en Supabase en ese modo.
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

  // Supabase no pide la contraseña actual, así que la app la comprueba antes iniciando sesión otra vez.
  private async confirmCurrentPassword(password: string) {
    const email = this.user()?.email;
    if (!email) throw new SupabaseAuthFailure('Tu sesión expiró. Vuelve a iniciar sesión.', 'session_not_found');
    const { error } = await (await this.supabase.auth()).signInWithPassword({ email, password });
    if (error) throw error.code === 'invalid_credentials' ? new SupabaseAuthFailure('La contraseña actual no es correcta.', 'invalid_credentials') : toAuthFailure(error);
  }

  // Compara la sesión guardada con la API; una falla de red conserva la sesión (la API puede estar despertando).
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

  // Reemplaza la sesión guardada después de un cambio del perfil que emitió un token nuevo (nombre o contraseña).
  replaceSession(token: string, user: AuthUser): void {
    writeSession({ token, user });
    this.session.set({ token, user });
  }

  // Actualiza los datos del perfil y conserva el token actual (el modo supabase nunca emite tokens propios).
  updateUser(user: AuthUser): void {
    const token = this.token();
    if (token) this.replaceSession(token, user);
  }

  // Olvida la sesión sin salir de la página actual.
  endSession(): void {
    this.clear();
  }

  // Cierra la sesión y muestra un mensaje en el login (después de restablecer la contraseña o de cambiar el correo).
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
      // El token es válido para Supabase, pero la API lo rechazó (correo sin confirmar, datos del perfil): se deja cerrada.
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

  // supabase-js renueva el token antes de que venza: se mantiene al día la copia que envía el interceptor.
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
    const home: Record<AuthUser['role'], string> = { store: '/admin', customer: '/ofertas', admin: '/' };
    void this.router.navigate([home[user.role]]);
  }
}
