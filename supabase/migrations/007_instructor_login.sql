-- ============================================================
-- 007 — Acesso ao Studio para instrutores
--
-- A tabela `instructors` não tinha colunas para credenciais de login. O admin
-- podia definir email/senha de acesso no formulário, mas o INSERT falhava com
-- PGRST204 (coluna inexistente) e o instrutor NÃO era salvo — o toast dizia
-- "adicionado" por causa de um fallback silencioso ao mock, mas o refetch do
-- Supabase não trazia nada. Estas colunas resolvem isso.
-- ============================================================

alter table public.instructors add column if not exists login_email    text;
alter table public.instructors add column if not exists login_password text;
