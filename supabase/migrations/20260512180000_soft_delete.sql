-- =====================================================================
-- Minibox EJC — Soft delete de clientes e usuários
--
-- - Clientes: já tinham campo `ativo`. Trocamos o unique constraint do
--   `codigo` por um unique index PARCIAL (só onde ativo=true), permitindo
--   reutilizar o número de crachá de clientes "excluídos".
-- - Profiles: novo campo `ativo`. Usuários inativos não aparecem em
--   queries e seu perfil retorna null no login (efeito de logout forçado).
-- - RLS dos dois esconde rows com ativo=false.
-- - RPCs de saldo agora filtram ativo=true.
-- - Novas RPCs admin: set_client_active e set_user_active.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles.ativo
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists ativo boolean not null default true;

-- ---------------------------------------------------------------------
-- 2. clients: unique parcial no codigo
-- ---------------------------------------------------------------------
alter table public.clients drop constraint if exists clients_codigo_key;
drop index if exists public.clients_codigo_idx;

create unique index if not exists clients_codigo_active_uidx
  on public.clients (codigo) where ativo = true;

-- Index não-único para lookups gerais
create index if not exists clients_codigo_idx on public.clients (codigo);

-- ---------------------------------------------------------------------
-- 3. RLS — esconde inativos
-- ---------------------------------------------------------------------
drop policy if exists "clients read auth" on public.clients;
create policy "clients read auth"
  on public.clients for select
  using (auth.uid() is not null and ativo = true);

drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id and ativo = true);
create policy "profiles admin read"
  on public.profiles for select
  using (public.is_admin() and ativo = true);

-- ---------------------------------------------------------------------
-- 4. RPCs de saldo: só operam em clientes ativos
-- ---------------------------------------------------------------------
create or replace function public.recarregar_saldo(p_codigo integer, p_valor numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id      uuid;
  v_saldo   numeric;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'NAO_AUTENTICADO'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'VALOR_INVALIDO'; end if;

  update public.clients
    set saldo = saldo + p_valor
    where codigo = p_codigo and ativo = true
    returning id, saldo into v_id, v_saldo;

  if not found then raise exception 'CLIENTE_NAO_ENCONTRADO'; end if;

  insert into public.transactions (cliente_id, tipo, valor, operador_id)
  values (v_id, 'RECARGA', p_valor, v_user_id);

  return v_saldo;
end;
$$;

create or replace function public.debitar_saldo(
  p_codigo    integer,
  p_valor     numeric,
  p_descricao text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client  public.clients%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'NAO_AUTENTICADO'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'VALOR_INVALIDO'; end if;

  select * into v_client
    from public.clients
    where codigo = p_codigo and ativo = true
    for update;
  if not found then raise exception 'CLIENTE_NAO_ENCONTRADO'; end if;

  update public.clients set saldo = saldo - p_valor where id = v_client.id
    returning saldo into v_client.saldo;

  insert into public.transactions (cliente_id, tipo, valor, descricao, operador_id)
  values (v_client.id, 'DEBITO', p_valor, p_descricao, v_user_id);

  return v_client.saldo;
end;
$$;

drop function if exists public.realizar_venda(integer, jsonb);

create or replace function public.realizar_venda(p_codigo integer, p_itens jsonb)
returns table (saldo_atual numeric, total numeric, transacao_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client   public.clients%rowtype;
  v_total    numeric(10,2) := 0;
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qtd      integer;
  v_tx_id    uuid;
  v_user_id  uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  select * into v_client
    from public.clients
    where codigo = p_codigo and ativo = true
    for update;
  if not found then
    raise exception 'CLIENTE_NAO_ENCONTRADO';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::int;
    if v_qtd is null or v_qtd <= 0 then
      raise exception 'QUANTIDADE_INVALIDA';
    end if;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

    if not found then
      raise exception 'PRODUTO_NAO_ENCONTRADO';
    end if;

    if v_product.quantidade < v_qtd then
      raise exception 'ESTOQUE_INSUFICIENTE: %', v_product.nome;
    end if;

    v_total := v_total + v_product.preco * v_qtd;
  end loop;

  update public.clients
    set saldo = saldo - v_total
    where id = v_client.id
    returning saldo into v_client.saldo;

  insert into public.transactions (cliente_id, tipo, valor, descricao, operador_id)
  values (
    v_client.id,
    'DEBITO',
    v_total,
    'Compra com ' || jsonb_array_length(p_itens) || ' itens',
    v_user_id
  )
  returning id into v_tx_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::int;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

    update public.products
      set quantidade = quantidade - v_qtd,
          updated_at = now()
      where id = v_product.id;

    insert into public.transaction_items (
      transaction_id, product_id, produto_nome, preco_unitario, quantidade, subtotal
    ) values (
      v_tx_id,
      v_product.id,
      v_product.nome,
      v_product.preco,
      v_qtd,
      v_product.preco * v_qtd
    );
  end loop;

  return query select v_client.saldo, v_total, v_tx_id;
end;
$$;

grant execute on function public.realizar_venda(integer, jsonb) to authenticated;
grant execute on function public.recarregar_saldo(integer, numeric) to authenticated;
grant execute on function public.debitar_saldo(integer, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. RPCs admin: soft delete e reativação
-- ---------------------------------------------------------------------
create or replace function public.set_client_active(p_id uuid, p_ativo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  update public.clients set ativo = p_ativo where id = p_id;

  if not found then
    raise exception 'CLIENTE_NAO_ENCONTRADO';
  end if;
end;
$$;

create or replace function public.set_user_active(p_user_id uuid, p_ativo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'PERMISSAO_NEGADA';
  end if;

  if p_user_id = auth.uid() and not p_ativo then
    raise exception 'NAO_PODE_DESATIVAR_PROPRIO_USUARIO';
  end if;

  update public.profiles set ativo = p_ativo where id = p_user_id;

  if not found then
    raise exception 'USUARIO_NAO_ENCONTRADO';
  end if;
end;
$$;

grant execute on function public.set_client_active(uuid, boolean) to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 6. get_dashboard: também filtra ativo=true
-- ---------------------------------------------------------------------
drop function if exists public.get_dashboard();

create or replace function public.get_dashboard()
returns table (
  total_recarga  numeric,
  total_debito   numeric,
  saldo_minibox  numeric,
  saldo_devedor  numeric,
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
    coalesce((select sum(saldo) from public.clients where ativo = true and saldo > 0), 0),
    coalesce((select sum(-saldo) from public.clients where ativo = true and saldo < 0), 0),
    (select count(*) from public.clients where ativo = true),
    (select count(*) from public.transactions);
$$;

grant execute on function public.get_dashboard() to authenticated;

-- ---------------------------------------------------------------------
-- 7. top_consumers: também filtra ativo=true
-- ---------------------------------------------------------------------
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
  where c.ativo = true
  group by c.id
  having coalesce(sum(t.valor), 0) > 0
  order by total_gasto desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.top_consumers(int) to authenticated;
