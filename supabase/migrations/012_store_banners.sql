-- ============================================================
-- 012 — Banners da Loja (carrossel na Home)
--
-- Fotos do banner "Nossa Loja" exibidas em carrossel na Home. O admin pode
-- adicionar quantas fotos quiser (sem limite). `sort_order` define a ordem;
-- `link_url` é opcional (para onde a foto leva ao ser tocada).
-- ============================================================

create table if not exists public.store_banners (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  link_url    text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.store_banners enable row level security;
drop policy if exists "store_banners_read"  on public.store_banners;
drop policy if exists "store_banners_write" on public.store_banners;
create policy "store_banners_read"  on public.store_banners for select using (true);
create policy "store_banners_write" on public.store_banners for all    using (public.is_admin());
