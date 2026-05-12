-- =====================================================================
-- Minibox EJC — Caixa também gerencia produtos e categorias
-- =====================================================================

-- 1. products: write para todos autenticados (não só admin)
drop policy if exists "products write admin" on public.products;
drop policy if exists "products write auth"  on public.products;

create policy "products write auth"
  on public.products
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 2. categories: write para todos autenticados
drop policy if exists "categories write admin" on public.categories;
drop policy if exists "categories write auth"  on public.categories;

create policy "categories write auth"
  on public.categories
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 3. Storage product-images: write para todos autenticados
drop policy if exists "product-images write admin"  on storage.objects;
drop policy if exists "product-images update admin" on storage.objects;
drop policy if exists "product-images delete admin" on storage.objects;
drop policy if exists "product-images write auth"   on storage.objects;
drop policy if exists "product-images update auth"  on storage.objects;
drop policy if exists "product-images delete auth"  on storage.objects;

create policy "product-images write auth"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.uid() is not null);

create policy "product-images update auth"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.uid() is not null)
  with check (bucket_id = 'product-images' and auth.uid() is not null);

create policy "product-images delete auth"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.uid() is not null);
