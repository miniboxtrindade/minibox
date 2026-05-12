-- =====================================================================
-- Minibox EJC — Dashboard: separa saldo em "a pagar" (positivos) e "a receber" (negativos)
-- saldo_minibox agora reflete apenas os saldos positivos (dinheiro em circulação nos crachás).
-- Adiciona saldo_devedor (módulo dos negativos = quanto os clientes devem ao minibox).
-- =====================================================================

drop function if exists public.get_dashboard();

create or replace function public.get_dashboard()
returns table (
  total_recarga  numeric,
  total_debito   numeric,
  saldo_minibox  numeric, -- soma dos saldos > 0 (em circulação)
  saldo_devedor  numeric, -- soma dos |saldo| onde saldo < 0
  clientes       bigint,
  transacoes     bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(valor) from public.transactions where tipo = 'RECARGA'), 0),
    coalesce((select sum(valor) from public.transactions where tipo = 'DEBITO'), 0),
    coalesce((select sum(saldo) from public.clients where saldo > 0), 0),
    coalesce((select sum(-saldo) from public.clients where saldo < 0), 0),
    (select count(*) from public.clients),
    (select count(*) from public.transactions);
$$;

grant execute on function public.get_dashboard() to authenticated;
