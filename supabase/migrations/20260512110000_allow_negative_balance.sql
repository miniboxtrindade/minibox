-- =====================================================================
-- Minibox EJC — Permite saldo negativo nos clientes
-- =====================================================================

-- 1. Remove o CHECK que impedia saldo < 0
alter table public.clients
  drop constraint if exists clients_saldo_check;

-- 2. debitar_saldo: remove validação de saldo insuficiente
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

  update public.clients set saldo = saldo - p_valor where id = v_client.id
    returning saldo into v_client.saldo;

  insert into public.transactions (cliente_id, tipo, valor, descricao, operador_id)
  values (v_client.id, 'DEBITO', p_valor, p_descricao, v_user_id);

  return v_client.saldo;
end;
$$;

grant execute on function public.debitar_saldo(integer, numeric, text) to authenticated;

-- 3. realizar_venda: remove validação de saldo insuficiente
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

  select * into v_client from public.clients where codigo = p_codigo for update;
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
