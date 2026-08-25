-- ============================================================
-- 016 — Tokens de push notifications (FCM)
--
-- Guarda o token FCM de cada dispositivo do usuário (web PWA e Android),
-- para um backend/Edge Function disparar notificações depois via FCM
-- HTTP v1 (o envio em si é server-side, fora do escopo do cliente).
--
-- Um token identifica UM dispositivo; o mesmo token pode ser re-emitido
-- pelo FCM, então a escrita é um upsert por `token`. RLS: cada usuário
-- lê/escreve/apaga apenas os próprios tokens.
-- ============================================================

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'web', -- 'web' | 'android' | 'ios'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

alter table public.push_tokens enable row level security;

create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (user_id = auth.uid());

create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_tokens_update_own on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated
  using (user_id = auth.uid());

-- Anon nunca acessa tokens.
revoke all on public.push_tokens from anon;
