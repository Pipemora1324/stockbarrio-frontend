// Configuración del build. scripts/set-env.mjs reescribe este archivo con las variables de Vercel
// AUTH_PROVIDER, SUPABASE_URL y SUPABASE_ANON_KEY, así cambian sin tocar el código.
export const environment: {
  authProvider: 'legacy' | 'supabase';
  supabaseUrl: string;
  supabaseAnonKey: string;
} = {
  // "legacy": el login propio de la API. "supabase": Supabase Auth (registro, login y recuperación de contraseña con un código).
  authProvider: 'legacy',
  // Valores públicos del proyecto de Supabase (la clave anon es pública por diseño; la service_role nunca va aquí).
  supabaseUrl: '',
  supabaseAnonKey: '',
};
