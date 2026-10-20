// Corre antes de `npm run build`. Si existe alguna de AUTH_PROVIDER, SUPABASE_URL o SUPABASE_ANON_KEY
// (por ejemplo en Vercel), escribe src/environments/environment.ts con ellas. Sin ninguna, el archivo del
// repositorio queda igual (login legacy).
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
// Una clave service_role da acceso total a la base: nunca debe ir dentro del frontend.
if (/service_role/.test(Buffer.from(supabaseAnonKey.split('.')[1] ?? '', 'base64url').toString()) || supabaseAnonKey.startsWith('sb_secret_')) {
  console.error('SUPABASE_ANON_KEY parece una clave secreta (service_role). Usa la clave pública "anon" o "publishable".');
  process.exit(1);
}

writeFileSync(
  new URL('../src/environments/environment.ts', import.meta.url),
  `// Generado al compilar por scripts/set-env.mjs.
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
