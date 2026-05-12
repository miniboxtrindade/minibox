-- =====================================================================
-- Minibox EJC — Categorias dinâmicas
-- Migra de enum product_category para tabela categories com FK.
-- =====================================================================

-- 1. Tabela categories
create table if not exists public.categories (
  key         text primary key,
  label       text not null,
  emoji       text not null default '📦',
  created_at  timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories read auth" on public.categories;
drop policy if exists "categories write admin" on public.categories;

create policy "categories read auth"
  on public.categories for select
  using (auth.uid() is not null);

create policy "categories write admin"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null; end $$;

-- 2. Seed das 4 categorias originais
insert into public.categories (key, label, emoji) values
  ('ALIMENTO',         'Alimentos',          '🍔'),
  ('BEBIDA',           'Bebidas',            '🥤'),
  ('DOCE',             'Doces',              '🍫'),
  ('ARTIGO_RELIGIOSO', 'Artigos Religiosos', '🙇🏻‍♂️')
on conflict (key) do nothing;

-- 3. Converter products.categoria de enum para text
do $$ begin
  alter table public.products
    alter column categoria drop default;
exception when others then null; end $$;

do $$ begin
  alter table public.products
    alter column categoria type text using categoria::text;
exception when others then null; end $$;

alter table public.products
  alter column categoria set default 'ALIMENTO',
  alter column categoria set not null;

-- 4. FK products.categoria → categories.key
do $$ begin
  alter table public.products
    add constraint products_categoria_fkey
    foreign key (categoria) references public.categories(key)
    on update cascade
    on delete restrict;
exception when duplicate_object then null; end $$;

-- 5. Drop o enum agora que não é mais referenciado
drop type if exists product_category;
