-- =====================================================================
-- Minibox EJC — Supabase schema
-- Rode este arquivo inteiro no SQL Editor do projeto Supabase.
-- Idempotente: pode ser executado mais de uma vez sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type product_category as enum ('ALIMENTO', 'BEBIDA', 'DOCE', 'ARTIGO_RELIGIOSO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type as enum ('RECARGA', 'DEBITO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('caixa', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. TABELAS
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  role        user_role not null default 'caixa',
  created_at  timestamptz not null default now()
);

create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  codigo        integer not null unique,
  nome          text not null,
  saldo         numeric(10,2) not null default 0 check (saldo >= 0),
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  preco       numeric(10,2) not null check (preco >= 0),
  quantidade  integer not null check (quantidade >= 0),
  categoria   product_category not null default 'ALIMENTO',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clients(id) on delete cascade,
  tipo        transaction_type not null,
  valor       numeric(10,2) not null check (valor > 0),
  descricao   text,
  created_at  timestamptz not null default now()
);

create index if not exists transactions_cliente_id_idx on public.transactions(cliente_id, created_at desc);
create index if not exists clients_codigo_idx on public.clients(codigo);

-- ---------------------------------------------------------------------
-- 3. TRIGGER: cria profile automaticamente no signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    'caixa'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. HELPERS DE ROLE
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

-- ---------------------------------------------------------------------
-- 5. RPC: realizar_venda (atômica)
--    p_itens = jsonb array: [{ "product_id": "...", "quantidade": 2 }, ...]
-- ---------------------------------------------------------------------
create or replace function public.realizar_venda(p_codigo integer, p_itens jsonb)
returns table (saldo_atual numeric, total numeric)
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
begin
  -- auth obrigatório
  if auth.uid() is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  -- lock no cliente
  select * into v_client from public.clients where codigo = p_codigo for update;
  if not found then
    raise exception 'CLIENTE_NAO_ENCONTRADO';
  end if;

  -- calcula total + valida estoque (com lock)
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

  if v_client.saldo < v_total then
    raise exception 'SALDO_INSUFICIENTE';
  end if;

  -- debita estoque
  for v_item in select * from jsonb_array_elements(p_itens) loop
    update public.products
      set quantidade = quantidade - (v_item->>'quantidade')::int,
          updated_at = now()
      where id = (v_item->>'product_id')::uuid;
  end loop;

  -- debita saldo
  update public.clients
    set saldo = saldo - v_total
    where id = v_client.id
    returning saldo into v_client.saldo;

  -- grava transação
  insert into public.transactions (cliente_id, tipo, valor, descricao)
  values (
    v_client.id,
    'DEBITO',
    v_total,
    'Compra com ' || jsonb_array_length(p_itens) || ' itens'
  );

  return query select v_client.saldo, v_total;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RPC: recarregar e debitar saldo manual (caixa)
-- ---------------------------------------------------------------------
create or replace function public.recarregar_saldo(p_codigo integer, p_valor numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_saldo numeric;
begin
  if auth.uid() is null then raise exception 'NAO_AUTENTICADO'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'VALOR_INVALIDO'; end if;

  update public.clients
    set saldo = saldo + p_valor
    where codigo = p_codigo
    returning id, saldo into v_id, v_saldo;

  if not found then raise exception 'CLIENTE_NAO_ENCONTRADO'; end if;

  insert into public.transactions (cliente_id, tipo, valor)
  values (v_id, 'RECARGA', p_valor);

  return v_saldo;
end;
$$;

create or replace function public.debitar_saldo(p_codigo integer, p_valor numeric, p_descricao text default null)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
begin
  if auth.uid() is null then raise exception 'NAO_AUTENTICADO'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'VALOR_INVALIDO'; end if;

  select * into v_client from public.clients where codigo = p_codigo for update;
  if not found then raise exception 'CLIENTE_NAO_ENCONTRADO'; end if;
  if v_client.saldo < p_valor then raise exception 'SALDO_INSUFICIENTE'; end if;

  update public.clients set saldo = saldo - p_valor where id = v_client.id
    returning saldo into v_client.saldo;

  insert into public.transactions (cliente_id, tipo, valor, descricao)
  values (v_client.id, 'DEBITO', p_valor, p_descricao);

  return v_client.saldo;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. RPC: dashboard
-- ---------------------------------------------------------------------
create or replace function public.get_dashboard()
returns table (
  total_recarga numeric,
  total_debito  numeric,
  saldo_minibox numeric,
  clientes      bigint,
  transacoes    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(valor) from public.transactions where tipo = 'RECARGA'), 0),
    coalesce((select sum(valor) from public.transactions where tipo = 'DEBITO'), 0),
    coalesce((select sum(saldo) from public.clients), 0),
    (select count(*) from public.clients),
    (select count(*) from public.transactions);
$$;

-- ---------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.clients      enable row level security;
alter table public.products     enable row level security;
alter table public.transactions enable row level security;

-- PROFILES
drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles self read"  on public.profiles for select using (auth.uid() = id);
create policy "profiles admin read" on public.profiles for select using (public.is_admin());

-- CLIENTS — caixa e admin leem; só admin gerencia diretamente
drop policy if exists "clients read auth"   on public.clients;
drop policy if exists "clients insert auth" on public.clients;
drop policy if exists "clients update admin" on public.clients;
drop policy if exists "clients delete admin" on public.clients;
create policy "clients read auth"    on public.clients for select using (auth.uid() is not null);
create policy "clients insert auth"  on public.clients for insert with check (auth.uid() is not null);
create policy "clients update admin" on public.clients for update using (public.is_admin());
create policy "clients delete admin" on public.clients for delete using (public.is_admin());

-- PRODUCTS — todos autenticados leem; só admin escreve
drop policy if exists "products read auth"   on public.products;
drop policy if exists "products write admin" on public.products;
create policy "products read auth"    on public.products for select using (auth.uid() is not null);
create policy "products write admin"  on public.products for all   using (public.is_admin()) with check (public.is_admin());

-- TRANSACTIONS — autenticados leem; inserts vêm via RPC (security definer), então sem policy de insert direto
drop policy if exists "transactions read auth" on public.transactions;
create policy "transactions read auth" on public.transactions for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 9. REALTIME (habilita replicação para clients e products)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.transactions;

-- ---------------------------------------------------------------------
-- 10. PERMISSÕES (RPCs precisam ser chamáveis pelo role authenticated)
-- ---------------------------------------------------------------------
grant execute on function public.realizar_venda(integer, jsonb) to authenticated;
grant execute on function public.recarregar_saldo(integer, numeric) to authenticated;
grant execute on function public.debitar_saldo(integer, numeric, text) to authenticated;
grant execute on function public.get_dashboard() to authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
