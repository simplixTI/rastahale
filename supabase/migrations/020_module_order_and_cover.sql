-- ============================================================
--  020 — Módulos do professor: ordem e capa
--
--  studio_sessions é o "módulo" curado de um professor (montado por ele no
--  Studio ou pelo admin em /admin/instrutores/:id). Até aqui a ordem era a
--  data de criação e a capa era a primeira aula.
-- ============================================================

alter table public.studio_sessions
  add column if not exists position  integer not null default 0,
  add column if not exists cover_url text;

-- Módulos que já existiam ganham a posição pela ordem em que foram criados.
update public.studio_sessions s
   set position = x.rn
  from (
    select id, row_number() over (partition by instructor_id order by created_at) as rn
      from public.studio_sessions
  ) x
 where x.id = s.id and s.position = 0;

create index if not exists studio_sessions_instructor_position_idx
  on public.studio_sessions (instructor_id, position);
