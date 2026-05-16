// Carga leve em /auth/v1/token (login) — Supabase tem rate limit por e-mail.
// Usamos a mesma credencial admin (testes@testes) — Supabase pode aplicar rate-limit;
// se aparecerem 429s, é o comportamento esperado e o teste passa enquanto p95 ficar OK.

import http from 'k6/http';
import { check, sleep } from 'k6';

const URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
const EMAIL = __ENV.LOGIN_EMAIL || 'testes@testes';
const PASS = __ENV.LOGIN_PASSWORD || 'testes@testes';

if (!URL || !ANON) throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente.');

export const options = {
  // Login é caro — carga ainda menor.
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    // Aceita até 50% de 429 (rate-limit Supabase por e-mail) sem falhar o teste
    http_req_failed: ['rate<0.55'],
  },
};

const HEADERS = {
  apikey: ANON,
  'Content-Type': 'application/json',
};

export default function () {
  const res = http.post(
    `${URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: EMAIL, password: PASS }),
    { headers: HEADERS },
  );
  check(res, {
    'status 200 ou 429 (rate-limit esperado)': (r) => r.status === 200 || r.status === 429,
  });
  sleep(1);
}
