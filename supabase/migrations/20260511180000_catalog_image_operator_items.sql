-- =====================================================================
-- Minibox EJC — Catálogo: imagem em produto + operador + itens de venda
-- Idempotente: pode ser executado mais de uma vez sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Produtos: colunas de imagem
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists imagem_url  text,
  add column if not exists imagem_path text;

-- ---------------------------------------------------------------------
-- 2. Transactions: operador (quem realizou a operação)
-- ---------------------------------------------------------------------
alter table public.transactions
  add column if not exists operador_id uuid references public.profiles(id) on delete set null;

create index if not exists transactions_operador_id_idx
  on public.transactions(operador_id);

-- ---------------------------------------------------------------------
-- 3. Itens da transação (detalhamento da venda)
--    Snapshot de nome/preço protege histórico se produto for deletado.
-- ---------------------------------------------------------------------
create table if not exists public.transaction_items (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  produto_nome    text not null,
  preco_unitario  numeric(10,2) not null check (preco_unitario >= 0),
  quantidade      integer not null check (quantidade > 0),
  subtotal        numeric(10,2) not null check (subtotal >= 0),
  created_at      timestamptz not null default now()
);

create index if not exists transaction_items_transaction_id_idx
  on public.transaction_items(transaction_id);

create index if not exists transaction_items_product_id_idx
  on public.transaction_items(product_id);

-- ---------------------------------------------------------------------
-- 4. RPC refatorada: realizar_venda grava operador + itens
-- ---------------------------------------------------------------------
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

  -- lock no cliente
  select * into v_client from public.clients where codigo = p_codigo for update;
  if not found then
    raise exception 'CLIENTE_NAO_ENCONTRADO';
  end if;

  -- valida estoque e calcula total
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

  -- debita saldo do cliente
  update public.clients
    set saldo = saldo - v_total
    where id = v_client.id
    returning saldo into v_client.saldo;

  -- registra transação
  insert into public.transactions (cliente_id, tipo, valor, descricao, operador_id)
  values (
    v_client.id,
    'DEBITO',
    v_total,
    'Compra com ' || jsonb_array_length(p_itens) || ' itens',
    v_user_id
  )
  returning id into v_tx_id;

  -- grava itens (com snapshot) e debita estoque
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

-- ---------------------------------------------------------------------
-- 5. RPCs recarregar/debitar registram operador também
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
    where codigo = p_codigo
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

  select * into v_client from public.clients where codigo = p_codigo for update;
  if not found then raise exception 'CLIENTE_NAO_ENCONTRADO'; end if;
  if v_client.saldo < p_valor then raise exception 'SALDO_INSUFICIENTE'; end if;

  update public.clients set saldo = saldo - p_valor where id = v_client.id
    returning saldo into v_client.saldo;

  insert into public.transactions (cliente_id, tipo, valor, descricao, operador_id)
  values (v_client.id, 'DEBITO', p_valor, p_descricao, v_user_id);

  return v_client.saldo;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. RLS para transaction_items (leitura para autenticados; insert via RPC)
-- ---------------------------------------------------------------------
alter table public.transaction_items enable row level security;

drop policy if exists "transaction_items read auth" on public.transaction_items;
create policy "transaction_items read auth"
  on public.transaction_items
  for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------
-- 7. Realtime para transaction_items
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.transaction_items;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 8. Storage: bucket público de imagens de produto (com RLS)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "product-images read"        on storage.objects;
drop policy if exists "product-images write admin" on storage.objects;
drop policy if exists "product-images delete admin" on storage.objects;
drop policy if exists "product-images update admin" on storage.objects;

create policy "product-images read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images write admin"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images update admin"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images delete admin"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
