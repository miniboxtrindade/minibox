// Cleanup pós-testes: remove dados marcados com [TEST-... ou T-... criados nos E2E.
// Roda em Node 18+ com fetch nativo.
//
//   node tests/cleanup.mjs

import { createClient } from '@supabase/supabase-js';

const URL = 'https://dngvovusdgfvfcpfhrdb.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZ3ZvdnVzZGdmdmZjcGZocmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjAzNTEsImV4cCI6MjA5NDA5NjM1MX0.4M0SGSCIKSLAyWLXkZH5DtVQI6wdYtwsNQnl1rZkthg';

const supabase = createClient(URL, ANON, { auth: { persistSession: false } });

const { error: authErr } = await supabase.auth.signInWithPassword({
  email: 'testes@testes',
  password: 'testes@testes',
});
if (authErr) {
  console.error('Falha login:', authErr.message);
  process.exit(1);
}
console.log('✓ Logado como admin');

// 1) Produtos com nome começando com [TEST-
const { data: prods, error: e1 } = await supabase
  .from('products')
  .select('id, nome')
  .ilike('nome', '[TEST-%');
if (e1) { console.error('list products:', e1.message); process.exit(1); }
console.log(`Produtos [TEST-*] encontrados: ${prods.length}`);

if (prods.length) {
  const ids = prods.map((p) => p.id);
  const { error } = await supabase.from('products').delete().in('id', ids);
  if (error) console.error('delete products:', error.message);
  else console.log(`✓ ${ids.length} produtos removidos`);
}

// 2) Clientes com nome começando com [TEST-
const { data: clis, error: e2 } = await supabase
  .from('clients')
  .select('id, nome, codigo')
  .ilike('nome', '[TEST-%');
if (e2) { console.error('list clients:', e2.message); process.exit(1); }
console.log(`Clientes [TEST-*] encontrados: ${clis.length}`);

// Tentar deletar via RPC set_client_active (soft-delete), ou via DELETE direto se permitir
if (clis.length) {
  // tenta DELETE direto primeiro
  const ids = clis.map((c) => c.id);
  const { error } = await supabase.from('clients').delete().in('id', ids);
  if (error) {
    // Fallback: marca inativo (soft-delete)
    console.log(`DELETE bloqueado (${error.message}). Marcando como inativo via RPC…`);
    for (const c of clis) {
      const { error: ee } = await supabase.rpc('set_client_active', { p_id: c.id, p_ativo: false });
      if (ee) console.error(`  set_client_active ${c.codigo}:`, ee.message);
    }
    console.log(`✓ ${clis.length} clientes desativados (soft-delete)`);
  } else {
    console.log(`✓ ${ids.length} clientes removidos`);
  }
}

// 3) Categorias T-*
const { data: cats, error: e3 } = await supabase
  .from('categories')
  .select('key, label')
  .ilike('key', 'T-%');
if (e3) { console.error('list categories:', e3.message); process.exit(1); }
console.log(`Categorias T-* encontradas: ${cats.length}`);

if (cats.length) {
  const keys = cats.map((c) => c.key);
  const { error } = await supabase.from('categories').delete().in('key', keys);
  if (error) console.error('delete categories:', error.message);
  else console.log(`✓ ${keys.length} categorias removidas`);
}

console.log('\n— Cleanup concluído —');
process.exit(0);
