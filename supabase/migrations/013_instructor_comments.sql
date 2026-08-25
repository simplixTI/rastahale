-- ============================================================
-- 013 — Comentários de alunos no perfil do instrutor
--
-- Antes os comentários viviam só no sessionStorage do navegador do aluno
-- (hook useInstructorComments): o instrutor nunca via o feedback. Esta
-- tabela persiste os comentários no Supabase.
--
-- Shape alinhado ao hook: id, instructor_id, user_id, user_name,
-- content (text), created_at. Um comentário por aluno por instrutor
-- (a UI em InstructorSection impõe essa regra).
-- ============================================================

create table if not exists public.instructor_comments (
  id            uuid primary key default gen_random_uuid(),
  instructor_id text not null references public.instructors(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  user_name     text not null default '',
  content       text not null,
  created_at    timestamptz not null default now(),
  unique (instructor_id, user_id)
);

alter table public.instructor_comments enable row level security;

-- Leitura: qualquer usuário autenticado vê os comentários (a página pública
-- do instrutor exibe a lista completa para todos os alunos logados).
drop policy if exists "comments_read" on public.instructor_comments;
create policy "comments_read" on public.instructor_comments
  for select to authenticated using (true);

-- Escrita: o aluno só cria comentário em seu próprio nome.
drop policy if exists "comments_insert" on public.instructor_comments;
create policy "comments_insert" on public.instructor_comments
  for insert to authenticated with check (user_id = auth.uid());

-- Remoção: o próprio autor ou o admin.
drop policy if exists "comments_delete" on public.instructor_comments;
create policy "comments_delete" on public.instructor_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
