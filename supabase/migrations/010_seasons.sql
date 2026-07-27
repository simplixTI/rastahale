-- ============================================================
-- 010 — Temporadas / Desafio com premiação
--
-- Um "desafio" com data final definida pelo admin. Quando a data chega, o admin
-- encerra pelo painel: o 1º colocado no ranking recebe um voucher e os níveis
-- reiniciam. O reset é NÃO-destrutivo: guardamos em `baselines` o total de aulas
-- assistidas de cada aluno no início da temporada; os pontos passam a contar só
-- o que foi assistido a partir dali (as aulas em si e o histórico ficam intactos).
--
-- Uma única linha (id = 'current') guarda o estado atual. O app já funciona sem
-- esta tabela (cai para o localStorage por navegador — ver src/hooks/useSeason.ts);
-- aplicar esta migração faz a temporada valer entre todos os usuários.
--
-- Leitura liberada para todos (o aluno precisa ver a data, o prêmio, o próprio
-- baseline e se venceu). Escrita só para admin. A premiação é decidida pelo
-- painel admin, que enxerga todos os perfis — o aluno só lê o próprio.
-- ============================================================

create table if not exists public.seasons (
  id          text primary key,
  ends_at     timestamptz,
  prize_text  text not null default '',
  prize_code  text not null default '',
  started_at  timestamptz not null default now(),
  baselines   jsonb not null default '{}'::jsonb,
  winner_id   text,
  winner_name text,
  awarded_at  timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.seasons enable row level security;

drop policy if exists "seasons_read"  on public.seasons;
drop policy if exists "seasons_write" on public.seasons;
create policy "seasons_read"  on public.seasons for select using (true);
create policy "seasons_write" on public.seasons for all    using (public.is_admin());

-- Linha única do estado atual.
insert into public.seasons (id) values ('current') on conflict (id) do nothing;
