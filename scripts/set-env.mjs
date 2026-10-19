// Runs before `npm run build`. When the ENABLE_ALERTS variable exists (for example in Vercel), it writes its value
// into src/environments/environment.ts. Without the variable the committed file is left untouched (alerts off).
import { writeFileSync } from 'node:fs';

const value = process.env.ENABLE_ALERTS;
if (value === undefined) process.exit(0);

const enabled = value.trim().toLowerCase() === 'true';
writeFileSync(
  new URL('../src/environments/environment.ts', import.meta.url),
  `// Generated at build time from ENABLE_ALERTS=${enabled}. See scripts/set-env.mjs.
export const environment = {
  enableAlerts: ${enabled},
};
`,
);
console.info(`ENABLE_ALERTS=${enabled}: alertas ${enabled ? 'activadas' : 'apagadas'} en este build.`);
