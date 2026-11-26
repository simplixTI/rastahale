-- ============================================================
--  023 — Liberação agendada de módulos
--
--  O admin escolhe quando o módulo entra para os alunos. Antes da data o aluno
--  vê o módulo e as aulas dele como "Em breve" e o servidor (bunny-stream) não
--  toca o vídeo. A equipe assiste normalmente. Nulo = já liberado.
--
--  Uma aula que também está num módulo já liberado continua aberta: a trava só
--  vale quando TODOS os módulos que contêm a aula ainda não chegaram na data.
--  A data própria da aula (videos.release_at, migration 021) continua valendo.
-- ============================================================

alter table public.studio_sessions add column if not exists release_at timestamptz;

-- Data em que a aula sai da trava dos módulos, ou null se ela não está presa
-- por nenhum. Mesma regra de moduleReleaseGate em src/lib/release.ts.
create or replace function public.lesson_module_release(p_video text)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
           when count(*) > 0 and bool_and(release_at is not null and release_at > now())
           then min(release_at)
         end
    from public.studio_sessions
   where p_video = any (video_ids);
$$;

revoke all on function public.lesson_module_release(text) from public, anon, authenticated;
