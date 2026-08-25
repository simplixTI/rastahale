-- ============================================================
-- 015 — Login de instrutor via Supabase Auth (fim da senha em plaintext)
--
-- Problema: a migration 007 criou `instructors.login_password` e a policy
-- "instructors_read" do full_migration.sql (`for select using (true)`, sem
-- cláusula TO) valia também para o role `anon` — ou seja, qualquer anônimo
-- lia email E SENHA em texto puro de todos os instrutores. O login no
-- cliente comparava a senha via query com a anon key.
--
-- Correção:
--  (a) instrutor passa a ser um usuário real do Supabase Auth, vinculado
--      pela nova coluna `user_id`;
--  (b) a leitura de instructors fica restrita a usuários autenticados;
--  (c) a coluna `login_password` é removida — não é mais usada.
--
-- O seed (scripts/seed-users.mjs) cria o auth user do professor e grava
-- `user_id` na linha de instructors. O cliente degrada graciosamente se
-- esta migration ainda não foi aplicada.
-- ============================================================

-- (a) Vínculo instructor ↔ auth.users -----------------------------------------
alter table public.instructors
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_instructors_user_id on public.instructors(user_id);

-- (b) Fecha a leitura anônima --------------------------------------------------
-- A policy antiga ("instructors_read", full_migration.sql) não tinha TO, logo
-- valia para anon. A do 001 ("Leitura de instrutores") já era authenticated-only.
drop policy if exists "instructors_read" on public.instructors;
create policy "instructors_read" on public.instructors
  for select to authenticated using (true);

-- (c) Remove a senha em plaintext ----------------------------------------------
alter table public.instructors drop column if exists login_password;

-- Nota: `login_email` é mantida (uso administrativo no painel), mas agora só
-- é legível por usuários autenticados. Novos instrutores devem ser criados
-- como usuários do Supabase Auth e vinculados via `user_id`.
