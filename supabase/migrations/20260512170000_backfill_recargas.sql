-- =====================================================================
-- Minibox EJC — Backfill de RECARGA para saldos inseridos diretamente
--
-- Para cada cliente, calcula o "saldo histórico" segundo transactions
-- (sum RECARGA - sum DEBITO) e compara com o saldo atual. A diferença
-- positiva indica saldo inserido fora do fluxo: insere um RECARGA de
-- ajuste com a descrição "Ajuste de saldo inicial".
--
-- Idempotente: rodar duas vezes não duplica porque na segunda execução
-- a diferença será zero.
-- =====================================================================

with historico as (
  select
    c.id,
    c.saldo as saldo_atual,
    coalesce((
      select sum(case when t.tipo = 'RECARGA' then t.valor else -t.valor end)
      from public.transactions t
      where t.cliente_id = c.id
    ), 0) as saldo_historico
  from public.clients c
),
ajustes as (
  select id, (saldo_atual - saldo_historico) as gap
  from historico
  where (saldo_atual - saldo_historico) > 0
)
insert into public.transactions (cliente_id, tipo, valor, descricao)
select id, 'RECARGA', gap, 'Ajuste de saldo inicial'
from ajustes;
