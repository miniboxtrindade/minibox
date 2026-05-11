-- =====================================================================
-- Hardening: revoga execute de PUBLIC nas RPCs e adiciona auth.uid()
-- check em get_dashboard (que estava aberta para anon).
-- =====================================================================

-- get_dashboard precisa de auth check explícito
create or replace function public.get_dashboard()
returns table (
  total_recarga numeric,
  total_debito  numeric,
  saldo_bodega  numeric,
  clientes      bigint,
  transacoes    bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  return query
    select
      coalesce((select sum(valor) from public.transactions where tipo = 'RECARGA'), 0),
      coalesce((select sum(valor) from public.transactions where tipo = 'DEBITO'), 0),
      coalesce((select sum(saldo) from public.clients), 0),
      (select count(*) from public.clients),
      (select count(*) from public.transactions);
end;
$$;

-- Revoga execute do public (default em CREATE FUNCTION)
revoke execute on function public.realizar_venda(integer, jsonb)        from public;
revoke execute on function public.recarregar_saldo(integer, numeric)    from public;
revoke execute on function public.debitar_saldo(integer, numeric, text) from public;
revoke execute on function public.get_dashboard()                       from public;
revoke execute on function public.current_role()                        from public;
revoke execute on function public.is_admin()                            from public;

-- Re-grant explícito só para authenticated
grant execute on function public.realizar_venda(integer, jsonb)        to authenticated;
grant execute on function public.recarregar_saldo(integer, numeric)    to authenticated;
grant execute on function public.debitar_saldo(integer, numeric, text) to authenticated;
grant execute on function public.get_dashboard()                       to authenticated;
grant execute on function public.current_role()                        to authenticated;
grant execute on function public.is_admin()                            to authenticated;
