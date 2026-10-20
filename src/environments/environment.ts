// Build-time settings. scripts/set-env.mjs rewrites this file from the Vercel variables
// AUTH_PROVIDER, SUPABASE_URL and SUPABASE_ANON_KEY, so they change without editing code.
export const environment: {
  authProvider: 'legacy' | 'supabase';
  supabaseUrl: string;
  supabaseAnonKey: string;
} = {
  // "legacy": the API's own login. "supabase": Supabase Auth (sign up, login and password recovery with a code).
  authProvider: 'legacy',
  // Public values of the Supabase project (the anon key is meant to be public; the service_role key never goes here).
  supabaseUrl: '',
  supabaseAnonKey: '',
};
