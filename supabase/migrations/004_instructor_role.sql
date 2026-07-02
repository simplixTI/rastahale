-- ============================================================
--  004_instructor_role.sql
--  Adiciona o papel "instructor" e as políticas RLS que permitem
--  um instrutor gerenciar (criar/editar/ocultar) apenas os PRÓPRIOS
--  vídeos, além de enxergá-los mesmo quando ocultos.
--
--  Contexto: o schema padrão (full_migration.sql) define
--  `user_role` como enum ('user','admin'). A área /studio (instrutor)
--  existia só no cliente; este script a habilita no backend.
--
--  ⚠️  Se o Postgres reclamar
--      "ALTER TYPE ... ADD VALUE cannot run inside a transaction block",
--      execute a linha do ALTER TYPE sozinha primeiro e depois o restante.
--      As políticas usam comparação por texto (role::text) de propósito,
--      para não referenciar o novo valor de enum na mesma transação.
-- ============================================================

-- 1. Papel instrutor -----------------------------------------------------------
alter type public.user_role add value if not exists 'instructor';

-- Alternativa (SOMENTE se, no seu ambiente, profiles.role for TEXT com CHECK
-- em vez de enum — ver 001_initial_schema.sql). Nesse caso, comente o ALTER TYPE
-- acima e use:
--   alter table public.profiles drop constraint if exists profiles_role_check;
--   alter table public.profiles
--     add constraint profiles_role_check check (role in ('user','admin','instructor'));

-- 2. Leitura: instrutor vê os próprios vídeos (inclusive ocultos) --------------
drop policy if exists "Leitura de videos visiveis" on public.videos;
create policy "Leitura de videos visiveis" on public.videos
  for select to authenticated
  using (
    visible = true
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
    or instructor_id = auth.uid()::text
  );

-- 3. Escrita: instrutor gerencia SOMENTE os próprios vídeos --------------------
--    (a política "Admin gerencia videos" do 001 continua valendo para admins).
drop policy if exists "Instrutor gerencia proprios videos" on public.videos;
create policy "Instrutor gerencia proprios videos" on public.videos
  for all to authenticated
  using (
    instructor_id = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text in ('admin','instructor'))
  )
  with check (
    instructor_id = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text in ('admin','instructor'))
  );

-- Nota sobre o FK: videos.instructor_id referencia instructors(id) (text).
-- O Studio grava instructor_id = <UUID do instrutor logado>. Por isso o seed
-- (scripts/seed-users.mjs) cria uma linha em `instructors` com id = UUID do
-- auth user do instrutor, para o INSERT do vídeo satisfazer a foreign key.
