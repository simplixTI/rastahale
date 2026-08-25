-- ============================================================
-- 014 — Sessões do Studio (módulos de vídeos do instrutor)
--
-- Antes as sessões criadas no /studio viviam só no sessionStorage do
-- navegador do instrutor (hook useStudioSessions): sumiam ao trocar de
-- dispositivo e os alunos nunca as viam. Esta tabela as persiste.
--
-- Shape alinhado ao hook: id, instructor_id, title, description,
-- video_ids (array), created_at.
-- ============================================================

create table if not exists public.studio_sessions (
  id            uuid primary key default gen_random_uuid(),
  instructor_id text not null references public.instructors(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  video_ids     text[] not null default '{}',
  created_at    timestamptz not null default now()
);

alter table public.studio_sessions enable row level security;

-- Leitura: qualquer usuário autenticado vê as sessões (os alunos veem os
-- módulos na página do instrutor — InstructorSection).
drop policy if exists "studio_sessions_read" on public.studio_sessions;
create policy "studio_sessions_read" on public.studio_sessions
  for select to authenticated using (true);

-- Escrita: o instrutor gerencia SOMENTE as próprias sessões; admin gerencia
-- todas. instructor_id é text e o Studio grava o UUID do auth user (ver 004).
drop policy if exists "studio_sessions_write" on public.studio_sessions;
create policy "studio_sessions_write" on public.studio_sessions
  for all to authenticated
  using      (instructor_id = auth.uid()::text or public.is_admin())
  with check (instructor_id = auth.uid()::text or public.is_admin());
