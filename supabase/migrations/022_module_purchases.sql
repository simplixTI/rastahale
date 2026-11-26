-- ============================================================
--  022 — Venda avulsa de módulos
--
--  O aluno sem plano compra um módulo do professor (studio_sessions) e ganha
--  acesso vitalício às aulas dele, inclusive às que entrarem depois no módulo.
--  O admin define o preço em /admin/vendas-modulos; sem preço o módulo não é
--  vendido avulso. A compra é gravada pelo webhook do Stripe (service role).
-- ============================================================

-- Preço do módulo em reais. Nulo = não está à venda avulso.
alter table public.studio_sessions
  add column if not exists price numeric(10,2) check (price is null or price > 0);

-- Só o admin define preço. O professor edita o próprio módulo (policy
-- studio_sessions_write), mas não pode mudar quanto ele custa.
create or replace function public.guard_studio_session_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (Edge Functions) e admin passam.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.price := null;
  elsif new.price is distinct from old.price then
    new.price := old.price;
  end if;
  return new;
end;
$$;

drop trigger if exists studio_sessions_price_guard on public.studio_sessions;
create trigger studio_sessions_price_guard
  before insert or update on public.studio_sessions
  for each row execute function public.guard_studio_session_price();

-- Compras de módulo. Uma por aluno e módulo.
create table if not exists public.module_purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  module_id         uuid not null references public.studio_sessions(id) on delete cascade,
  -- 'stripe' (site) | 'admin' (liberado à mão) | 'play_store' | 'app_store'
  source            text not null default 'stripe',
  amount            numeric(10,2),
  stripe_session_id text unique,
  created_at        timestamptz not null default now(),
  unique (user_id, module_id)
);

create index if not exists module_purchases_module_idx on public.module_purchases (module_id);

alter table public.module_purchases enable row level security;

-- O aluno vê as próprias compras; o admin vê e gerencia todas. A gravação
-- normal vem do webhook, com service role (ignora RLS).
drop policy if exists "module_purchases_read"  on public.module_purchases;
drop policy if exists "module_purchases_admin" on public.module_purchases;
create policy "module_purchases_read" on public.module_purchases
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "module_purchases_admin" on public.module_purchases
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A aula faz parte de algum módulo que o aluno comprou? Usada pela Edge
-- Function bunny-stream (mesma regra de src/lib/access.ts).
create or replace function public.owns_lesson(p_user uuid, p_video text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.module_purchases mp
      join public.studio_sessions s on s.id = mp.module_id
     where mp.user_id = p_user
       and p_video = any (s.video_ids)
  );
$$;

revoke all on function public.owns_lesson(uuid, text) from public, anon, authenticated;
