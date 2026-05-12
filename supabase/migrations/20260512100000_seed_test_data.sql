-- =====================================================================
-- Minibox EJC — Seed de dados de teste (11 produtos + 6 clientes)
-- Idempotente: on conflict do nothing nas chaves naturais (nome, codigo)
-- =====================================================================

insert into public.products (nome, preco, quantidade, categoria) values
  ('X-Burger',                  15.00, 30, 'ALIMENTO'),
  ('Cachorro-Quente',           12.00, 25, 'ALIMENTO'),
  ('Pão de Queijo',              5.00, 50, 'ALIMENTO'),
  ('Coca-Cola Lata',             6.00, 60, 'BEBIDA'),
  ('Suco de Laranja 300ml',      7.00, 40, 'BEBIDA'),
  ('Água Mineral 500ml',         4.00, 80, 'BEBIDA'),
  ('Brigadeiro',                 3.00, 80, 'DOCE'),
  ('Beijinho',                   3.00, 60, 'DOCE'),
  ('Bolo de Chocolate (fatia)',  6.00, 20, 'DOCE'),
  ('Terço EJC',                 25.00, 15, 'ARTIGO_RELIGIOSO'),
  ('Camiseta EJC',              45.00, 12, 'ARTIGO_RELIGIOSO')
on conflict do nothing;

insert into public.clients (codigo, nome, saldo) values
  (1001, 'Ana Carolina Silva',    50.00),
  (1002, 'Pedro Henrique Souza',  35.00),
  (1003, 'Mariana Oliveira',     100.00),
  (1004, 'João Vitor Costa',      20.00),
  (1005, 'Beatriz Almeida',       75.00),
  (1006, 'Lucas Nascimento Dev',  60.00)
on conflict (codigo) do nothing;
