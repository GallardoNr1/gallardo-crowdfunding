// Aplica las plantillas de supabase/email-templates/ (HTML + subjects.json) a Supabase Auth
// a través de la Management API, para no pegarlas a mano en el panel.
//
// Necesita un token personal de Supabase (https://supabase.com/dashboard/account/tokens):
// se lee de SUPABASE_ACCESS_TOKEN (variable de entorno o .env local). El proyecto se deduce
// de PUBLIC_SUPABASE_URL, o se fuerza con SUPABASE_PROJECT_REF.
//
//   npm run supabase:email-templates           # aplica
//   npm run supabase:email-templates -- --dry  # solo muestra qué enviaría
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'supabase', 'email-templates');

function readDotEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return out;
}

const dotenv = readDotEnv();
const token = process.env.SUPABASE_ACCESS_TOKEN ?? dotenv.SUPABASE_ACCESS_TOKEN;
const supabaseUrl =
  process.env.PUBLIC_SUPABASE_URL ?? dotenv.PUBLIC_SUPABASE_URL ?? '';
const ref =
  process.env.SUPABASE_PROJECT_REF ??
  supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!token || !ref) {
  console.error(
    'Faltan SUPABASE_ACCESS_TOKEN (token personal) o PUBLIC_SUPABASE_URL.'
  );
  process.exit(1);
}

const subjects = JSON.parse(readFileSync(join(dir, 'subjects.json'), 'utf8'));
const body = {};
for (const [name, subject] of Object.entries(subjects)) {
  body[`mailer_subjects_${name}`] = subject;
  body[`mailer_templates_${name}_content`] = readFileSync(
    join(dir, `${name}.html`),
    'utf8'
  );
}

if (process.argv.includes('--dry')) {
  for (const [key, value] of Object.entries(body)) {
    console.log(`${key}: ${value.length} caracteres`);
  }
  process.exit(0);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/config/auth`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
);
if (!res.ok) {
  console.error(`Error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const applied = await res.json();
let failed = 0;
for (const key of Object.keys(body)) {
  const ok = applied[key] === body[key];
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok' : '??'} ${key}`);
}
if (failed > 0) {
  console.error(`${failed} campo(s) no coinciden con lo enviado.`);
  process.exit(1);
}
console.log(`Plantillas aplicadas en el proyecto ${ref}.`);
