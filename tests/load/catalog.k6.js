// Carga leve contra Supabase prod — leitura de catálogo (GET /products).
// Pré-lançamento: usuários reais ainda não atingidos; uso de chave anon (RLS aplicada).
//
// Execução:
//   set SUPABASE_URL=https://dngvovusdgfvfcpfhrdb.supabase.co
//   set SUPABASE_ANON_KEY=eyJ...
//   k6 run tests/load/catalog.k6.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente.');
}

export const options = {
  // Pré-lançamento: carga leve pra não estourar quotas Supabase.
  // 20 VUs por 30s → ~600 requests, far below free-tier limits.
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // p95 < 1s
    http_req_failed: ['rate<0.02'],     // <2% errors
  },
};

const HEADERS = {
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  Accept: 'application/json',
};

export default function () {
  // Lista de produtos ordenada por nome — mesmo que /home e /catalog fazem
  const res = http.get(`${URL}/rest/v1/products?select=*&order=nome`, { headers: HEADERS });

  check(res, {
    'status 200': (r) => r.status === 200,
    'tem body JSON': (r) => r.body && r.body.length > 2,
    'p95 < 1s indiretamente': (r) => r.timings.duration < 1500,
  });

  sleep(0.5);
}
