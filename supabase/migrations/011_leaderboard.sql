-- ============================================================
-- 011 — View de ranking (leaderboard) para os alunos
--
-- A RLS de `profiles` deixa cada aluno ler só o próprio perfil
-- (profiles_read_own: id = auth.uid() or is_admin()). Por isso, na Home, o
-- aluno não enxerga os concorrentes no ranking. Como RLS é por LINHA (não dá
-- para esconder colunas), a solução é uma view que expõe APENAS os campos
-- necessários — nome, avatar e nº de aulas — de todos os alunos.
--
-- A view é dona do `postgres` e roda com os privilégios do dono (não usa
-- security_invoker) — por isso ignora a RLS de profiles e devolve todos os
-- alunos. Isso é intencional e seguro aqui: só expõe dados não sensíveis
-- (nada de email, plano, status ou pagamento). O acesso é liberado só para
-- usuários logados (role `authenticated`), nunca para `anon`.
--
-- O app já funciona sem esta view (cai para `profiles`, e aí o aluno vê só a si
-- mesmo). Aplicar esta migração faz o ranking completo aparecer para todos.
-- ============================================================

create or replace view public.leaderboard as
  select id, name, avatar_url, videos_watched
  from public.profiles
  where role = 'user';

-- Só quem está logado pode ler o ranking.
revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;
