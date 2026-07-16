-- ============================================================
-- 009 — Modalidades gerenciáveis
--
-- Antes só existiam duas modalidades fixas (jiu-jitsu / luta-livre), travadas
-- no código E no banco (a coluna videos.category era um ENUM). Esta migração
-- torna a lista de modalidades editável pelo admin e libera a coluna para
-- aceitar novas modalidades.
-- ============================================================

-- Tabela de modalidades (id = valor guardado em videos.category; label = exibição)
create table if not exists public.modalities (
  id          text primary key,
  label       text not null,
  created_at  timestamptz not null default now()
);

alter table public.modalities enable row level security;
drop policy if exists "modalities_read"  on public.modalities;
drop policy if exists "modalities_write" on public.modalities;
create policy "modalities_read"  on public.modalities for select using (true);
create policy "modalities_write" on public.modalities for all    using (public.is_admin());

insert into public.modalities (id, label) values
  ('jiu-jitsu',  'Jiu Jitsu'),
  ('luta-livre', 'Luta Livre')
on conflict (id) do nothing;

-- videos.category: de ENUM/lista fixa para TEXTO livre (aceita novas modalidades).
-- O `using ... ::text` converte os valores existentes sem perda.
alter table public.videos alter column category type text using category::text;

-- Remove os CHECKs antigos que limitavam category às duas modalidades fixas
-- (nomes padrão do Postgres; `if exists` = seguro em qualquer schema).
alter table public.videos  drop constraint if exists videos_category_check;
alter table public.modules drop constraint if exists modules_category_check;
