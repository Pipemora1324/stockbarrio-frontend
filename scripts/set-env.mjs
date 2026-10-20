// Runs before `npm run build`. When any of AUTH_PROVIDER, SUPABASE_URL or SUPABASE_ANON_KEY exists
// (for example in Vercel), it writes src/environments/environment.ts from them. Without any of them the committed
// file is left untouched (legacy login).
import { writeFileSync } from 'node:fs';

const names = ['AUTH_PROVIDER', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
if (names.every((name) => process.env[name] === undefined)) process.exit(0);

const read = (name) => (process.env[name] ?? '').trim();
const authProvider = read('AUTH_PROVIDER').toLowerCase() === 'supabase' ? 'supabase' : 'legacy';
const supabaseUrl = read('SUPABASE_URL').replace(/\/+$/, '');
const supabaseAnonKey = read('SUPABASE_ANON_KEY');

if (authProvider === 'supabase' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('AUTH_PROVIDER=supabase necesita SUPABASE_URL y SUPABASE_ANON_KEY. Se detiene el build para no publicar un login que no funciona.');
  process.exit(1);
}
// A service_role key gives full access to the database: it must never be bundled into the frontend.
if (/service_role/.test(Buffer.from(supabaseAnonKey.split('.')[1] ?? '', 'base64url').toString()) || supabaseAnonKey.startsWith('sb_secret_')) {
  console.error('SUPABASE_ANON_KEY parece una clave secreta (service_role). Usa la clave pública "anon" o "publishable".');
  process.exit(1);
}

writeFileSync(
  new URL('../src/environments/environment.ts', import.meta.url),
  `// Generated at build time by scripts/set-env.mjs.
export const environment: {
  authProvider: 'legacy' | 'supabase';
  supabaseUrl: string;
  supabaseAnonKey: string;
} = {
  authProvider: ${JSON.stringify(authProvider)},
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},
};
`,
);
console.info(`Build con autenticación ${authProvider}.`);
