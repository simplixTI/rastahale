-- ============================================================
-- 008 — Módulos (categorias de aula) gerenciáveis
--
-- Antes, a lista de "módulos" (Fundamentos, Raspagens, etc.) era fixa no código
-- (src/data/mockData.ts → videoCategories) e não dava para editar pela tela.
-- Esta tabela torna a lista editável pelo admin, separada por modalidade
-- (jiu-jitsu / luta-livre). O `subcategory` do vídeo continua sendo um texto
-- livre; os módulos apenas alimentam o seletor no cadastro da aula e nos planos.
-- ============================================================

create table if not exists public.modules (
  id          text primary key,
  name        text not null,
  category    text not null check (category in ('jiu-jitsu','luta-livre')),
  created_at  timestamptz not null default now()
);

alter table public.modules enable row level security;

drop policy if exists "modules_read"  on public.modules;
drop policy if exists "modules_write" on public.modules;
create policy "modules_read"  on public.modules for select using (true);
create policy "modules_write" on public.modules for all    using (public.is_admin());

-- Seed: as categorias atuais, disponíveis nas duas modalidades. O admin pode
-- renomear/remover/adicionar depois. ON CONFLICT evita duplicar se rodar de novo.
insert into public.modules (id, name, category) values
  ('mod-jj-fundamentos',      'Fundamentos',        'jiu-jitsu'),
  ('mod-jj-avancado',         'Avançado',           'jiu-jitsu'),
  ('mod-jj-defesas',          'Defesas',            'jiu-jitsu'),
  ('mod-jj-condicionamento',  'Condicionamento',    'jiu-jitsu'),
  ('mod-jj-raspagens',        'Raspagens',          'jiu-jitsu'),
  ('mod-jj-finalizacoes',     'Finalizações',       'jiu-jitsu'),
  ('mod-jj-passagem',         'Passagem de Guarda', 'jiu-jitsu'),
  ('mod-ll-fundamentos',      'Fundamentos',        'luta-livre'),
  ('mod-ll-avancado',         'Avançado',           'luta-livre'),
  ('mod-ll-defesas',          'Defesas',            'luta-livre'),
  ('mod-ll-condicionamento',  'Condicionamento',    'luta-livre'),
  ('mod-ll-raspagens',        'Raspagens',          'luta-livre'),
  ('mod-ll-finalizacoes',     'Finalizações',       'luta-livre'),
  ('mod-ll-passagem',         'Passagem de Guarda', 'luta-livre')
on conflict (id) do nothing;
