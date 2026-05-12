-- =====================================================================
-- Minibox EJC — Funcionalidades administrativas
-- - set_user_role: admin promove/rebaixa outros usuários (sem auto-rebaixar)
-- - top_consumers: top N clientes que mais consumiram (DEBITO)
-- =====================================================================

-- 1. set_user_role
create or replace function public.set_user_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'NAO_PODE_REMOVER_PROPRIO_ADMIN';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  if not found then
    raise exception 'USUARIO_NAO_ENCONTRADO';
  end if;
end;
$$;

grant execute on function public.set_user_role(uuid, user_role) to authenticated;

-- 2. top_consumers
create or replace function public.top_consumers(p_limit int default 10)
returns table (
  id           uuid,
  codigo       integer,
  nome         text,
  saldo        numeric,
  total_gasto  numeric,
  num_compras  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.codigo,
         c.nome,
         c.saldo,
         coalesce(sum(t.valor), 0) as total_gasto,
         count(t.id) as num_compras
  from public.clients c
  left join public.transactions t
    on t.cliente_id = c.id and t.tipo = 'DEBITO'
  group by c.id
  having coalesce(sum(t.valor), 0) > 0
  order by total_gasto desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.top_consumers(int) to authenticated;
