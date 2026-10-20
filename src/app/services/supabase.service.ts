import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabaseEnabled = () => environment.authProvider === 'supabase';

// Capa delgada para que la app (y las pruebas) usen un solo cliente de Supabase Auth. supabase-js se descarga al usarlo
// por primera vez, solo en el modo supabase, así el build legacy no lo carga; el cliente usa la clave pública anon.
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: Promise<SupabaseClient> | null = null;

  async auth(): Promise<SupabaseClient['auth']> {
    this.client ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Los enlaces de confirmación vuelven a /login solo para mostrar un aviso; la persona entra con la contraseña.
          detectSessionInUrl: false,
          storageKey: 'stockbarrio-supabase',
        },
      }),
    );
    return (await this.client).auth;
  }
}

// Mensajes en español para los códigos de error de Supabase Auth que puede encontrar la app.
const messages: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña son incorrectos.',
  email_not_confirmed: 'Todavía no has confirmado tu correo. Abre el enlace que te enviamos o pide otro.',
  user_already_exists: 'Este correo electrónico ya está registrado.',
  email_exists: 'Este correo electrónico ya está registrado.',
  weak_password: 'La contraseña es muy débil. Usa entre 8 y 72 caracteres, con al menos una letra y un número.',
  same_password: 'La contraseña nueva debe ser distinta de la anterior.',
  otp_expired: 'El código no es válido o ya venció. Pide otro.',
  otp_disabled: 'La recuperación con código no está activada. Escríbele al equipo de Stock Barrio.',
  over_email_send_rate_limit: 'Ya te enviamos varios correos. Espera unos minutos antes de pedir otro.',
  over_request_rate_limit: 'Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  session_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  session_expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  refresh_token_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  email_address_invalid: 'El correo electrónico no es válido.',
  signup_disabled: 'El registro está desactivado por ahora.',
  validation_failed: 'Revisa los datos e inténtalo de nuevo.',
};

export class SupabaseAuthFailure extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

// Convierte un error de Supabase (o una falla de red) en un SupabaseAuthFailure con un mensaje en español.
export const toAuthFailure = (error: unknown): SupabaseAuthFailure => {
  const { code, status, name } = (error ?? {}) as { code?: string; status?: number; name?: string };
  if (code && messages[code]) return new SupabaseAuthFailure(messages[code], code);
  if (status === 429) return new SupabaseAuthFailure(messages['over_request_rate_limit'], 'over_request_rate_limit');
  if (name === 'AuthRetryableFetchError' || status === 0) return new SupabaseAuthFailure('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.', 'network');
  return new SupabaseAuthFailure('No se pudo completar la operación. Inténtalo de nuevo.', code ?? 'unknown');
};
