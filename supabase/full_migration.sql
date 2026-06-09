-- ============================================================
-- RastaHale Academy — Migração completa
-- Cole este SQL no Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Tipos ENUM ───────────────────────────────────────────────
do $$ begin
  create type video_category   as enum ('jiu-jitsu', 'luta-livre');
  create type video_level      as enum ('Iniciante', 'Intermediário', 'Avançado');
  create type plan_interval    as enum ('mensal', 'trimestral', 'anual');
  create type user_status      as enum ('ativo', 'inativo', 'pendente');
  create type user_role        as enum ('user', 'admin');
  create type payment_method   as enum ('PIX', 'Cartão', 'Boleto');
  create type payment_status   as enum ('pago', 'pendente', 'falhou');
exception when duplicate_object then null; end $$;

-- ── Tabela: instructors ───────────────────────────────────────
create table if not exists public.instructors (
  id          text primary key,
  name        text not null,
  avatar_url  text not null default '',
  bio         text not null default '',
  created_at  timestamptz not null default now()
);

-- ── Tabela: videos ────────────────────────────────────────────
create table if not exists public.videos (
  id                  text primary key,
  title               text not null,
  description         text not null default '',
  thumbnail           text not null default '',
  duration            text not null default '00:00',
  category            video_category not null,
  subcategory         text not null,
  level               video_level not null,
  instructor_id       text not null references public.instructors(id) on delete restrict,
  visible             boolean not null default true,
  unlock_by_progress  boolean not null default false,
  required_progress   integer not null default 0,
  created_at          timestamptz not null default now()
);

-- ── Tabela: plans ─────────────────────────────────────────────
create table if not exists public.plans (
  id          text primary key,
  name        text not null,
  price       numeric(10,2) not null,
  interval    plan_interval not null,
  features    text[] not null default '{}',
  active      boolean not null default true,
  categories  text[] not null default '{}',
  max_level   video_level not null default 'Iniciante',
  created_at  timestamptz not null default now()
);

-- ── Tabela: profiles ──────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  name           text not null default '',
  avatar_url     text not null default '',
  plan_name      text not null default 'Básico',
  status         user_status not null default 'pendente',
  role           user_role not null default 'user',
  join_date      date not null default current_date,
  last_access    timestamptz not null default now(),
  videos_watched integer not null default 0,
  total_hours    numeric(8,2) not null default 0
);

-- ── Tabela: payments ─────────────────────────────────────────
create table if not exists public.payments (
  id         text primary key default gen_random_uuid()::text,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  user_name  text not null,
  amount     numeric(10,2) not null,
  method     payment_method not null,
  status     payment_status not null default 'pendente',
  date       date not null default current_date,
  plan_name  text not null,
  created_at timestamptz not null default now()
);

-- ── Tabela: user_progress ─────────────────────────────────────
create table if not exists public.user_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  video_id        text not null references public.videos(id) on delete cascade,
  progress        integer not null default 0 check (progress >= 0 and progress <= 100),
  watched         boolean not null default false,
  is_favorite     boolean not null default false,
  last_watched_at timestamptz not null default now(),
  unique(user_id, video_id)
);

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_videos_category    on public.videos(category);
create index if not exists idx_videos_visible     on public.videos(visible);
create index if not exists idx_payments_user_id   on public.payments(user_id);
create index if not exists idx_payments_status    on public.payments(status);
create index if not exists idx_progress_user_id   on public.user_progress(user_id);
create index if not exists idx_progress_video_id  on public.user_progress(video_id);
create index if not exists idx_progress_favorite  on public.user_progress(user_id, is_favorite) where is_favorite = true;

-- ── Função: progresso geral do usuário ───────────────────────
create or replace function public.get_user_overall_progress(p_user_id uuid)
returns integer language sql stable security definer as $$
  select coalesce(
    (select round(avg(progress))::integer
     from public.user_progress
     where user_id = p_user_id),
    0
  );
$$;

-- ── Função: atualizar stats do perfil ao salvar progresso ─────
create or replace function public.update_profile_stats()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set
    last_access    = now(),
    videos_watched = (
      select count(*) from public.user_progress
      where user_id = new.user_id and watched = true
    ),
    total_hours = (
      select coalesce(
        round(
          sum(
            (
              split_part(v.duration, ':', 1)::integer * 60
              + split_part(v.duration, ':', 2)::integer
            ) * (up.progress / 100.0) / 60.0
          )::numeric, 2
        ), 0)
      from public.user_progress up
      join public.videos v on v.id = up.video_id
      where up.user_id = new.user_id
    )
  where id = new.user_id;
  return new;
end;
$$;

create or replace trigger trg_progress_update_stats
after insert or update on public.user_progress
for each row execute function public.update_profile_stats();

-- ── Função: criar perfil ao registrar novo usuário ────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ── Helper: verificar se usuário é admin ─────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.instructors    enable row level security;
alter table public.videos         enable row level security;
alter table public.plans          enable row level security;
alter table public.profiles       enable row level security;
alter table public.payments       enable row level security;
alter table public.user_progress  enable row level security;

-- instructors
create policy "instructors_read"   on public.instructors for select using (true);
create policy "instructors_write"  on public.instructors for all    using (public.is_admin());

-- videos
create policy "videos_read"        on public.videos for select using (visible = true or public.is_admin());
create policy "videos_write_admin" on public.videos for all    using (public.is_admin());

-- plans
create policy "plans_read"         on public.plans for select using (true);
create policy "plans_write"        on public.plans for all    using (public.is_admin());

-- profiles
create policy "profiles_read_own"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy "profiles_insert"     on public.profiles for insert with check (id = auth.uid());
create policy "profiles_admin_all"  on public.profiles for delete using (public.is_admin());

-- payments
create policy "payments_read_own"    on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy "payments_write_admin" on public.payments for all    using (public.is_admin());

-- user_progress
create policy "progress_read_own"   on public.user_progress for select using (user_id = auth.uid() or public.is_admin());
create policy "progress_insert_own" on public.user_progress for insert with check (user_id = auth.uid());
create policy "progress_update_own" on public.user_progress for update using (user_id = auth.uid());
create policy "progress_delete_own" on public.user_progress for delete using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- SEED: Dados iniciais
-- ============================================================

-- Instrutores
insert into public.instructors (id, name, avatar_url, bio) values
  ('inst-1', 'Rafael Leão',  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', 'Faixa preta 3º grau de Jiu Jitsu. 15 anos de experiência.'),
  ('inst-3', 'Diego Santos', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', 'Campeão nacional de Luta Livre. Instrutor há 10 anos.')
on conflict (id) do nothing;

-- Planos
insert into public.plans (id, name, price, interval, features, active, categories, max_level) values
  ('plan-1', 'Básico', 39.90, 'mensal',
   array['Acesso a aulas de Fundamentos', '1 categoria', 'Suporte por email'],
   true, array['Fundamentos'], 'Iniciante'),
  ('plan-2', 'Premium', 79.90, 'mensal',
   array['Acesso total', 'Todas as categorias', 'Aulas avançadas', 'Suporte prioritário', 'Downloads offline'],
   true, array['Fundamentos','Avançado','Defesas','Condicionamento','Raspagens','Finalizações','Passagem de Guarda'], 'Avançado'),
  ('plan-3', 'Anual Premium', 699.90, 'anual',
   array['Tudo do Premium', '2 meses grátis', 'Acesso antecipado', 'Mentoria mensal'],
   true, array['Fundamentos','Avançado','Defesas','Condicionamento','Raspagens','Finalizações','Passagem de Guarda'], 'Avançado')
on conflict (id) do nothing;

-- Vídeos
insert into public.videos (id, title, description, thumbnail, duration, category, subcategory, level, instructor_id, visible, unlock_by_progress, required_progress) values
  ('v1',  'Guarda Fechada — Fundamentos',    'Aprenda os princípios básicos da guarda fechada, incluindo postura, controle de distância e as primeiras finalizações.',  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=225&fit=crop',  '12:30', 'jiu-jitsu',  'Fundamentos',         'Iniciante',    'inst-1', true,  false, 0),
  ('v2',  'Passagem de Guarda Básica',        'Técnicas essenciais para passar a guarda do oponente com segurança e eficiência.',                                         'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=400&h=225&fit=crop',  '15:45', 'jiu-jitsu',  'Passagem de Guarda',  'Iniciante',    'inst-1', true,  false, 0),
  ('v3',  'Raspagens da Guarda',              'Domine as principais raspagens partindo da guarda fechada.',                                                                'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop',  '18:20', 'jiu-jitsu',  'Raspagens',           'Intermediário','inst-1', true,  false, 0),
  ('v4',  'Montada e Controle',               'Como manter a posição montada e aplicar pressão eficiente.',                                                               'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400&h=225&fit=crop',  '14:10', 'jiu-jitsu',  'Fundamentos',         'Iniciante',    'inst-1', true,  false, 0),
  ('v5',  'Berimbolo — Entrada e Controle',   'Técnica avançada de inversão para chegar às costas do oponente.',                                                          'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=225&fit=crop',  '22:15', 'jiu-jitsu',  'Avançado',            'Avançado',     'inst-1', true,  true,  50),
  ('v6',  'Leg Lock System',                  'Sistema completo de ataques às pernas com transições fluidas.',                                                             'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop',  '25:00', 'jiu-jitsu',  'Finalizações',        'Avançado',     'inst-1', true,  false, 0),
  ('v7',  'Triângulo — Variações Avançadas',  'Todas as variações do triângulo partindo de diferentes posições.',                                                          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=225&fit=crop',  '19:40', 'jiu-jitsu',  'Finalizações',        'Avançado',     'inst-1', false, false, 0),
  ('v8',  'Defesa de Queda',                  'Como defender quedas e manter a posição em pé.',                                                                           'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=225&fit=crop',  '17:00', 'luta-livre', 'Defesas',             'Iniciante',    'inst-3', true,  false, 0),
  ('v9',  'Controle no Solo',                 'Posições de controle e transições no chão.',                                                                               'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=225&fit=crop',  '20:15', 'luta-livre', 'Fundamentos',         'Intermediário','inst-3', true,  false, 0),
  ('v10', 'Finalizações da Luta Livre',        'As finalizações mais eficientes da luta livre esportiva.',                                                                 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=225&fit=crop',  '23:30', 'luta-livre', 'Finalizações',        'Avançado',     'inst-3', true,  false, 0),
  ('v11', 'Condicionamento para Luta',         'Treino físico específico para artes marciais e luta livre.',                                                               'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=225&fit=crop',  '30:00', 'luta-livre', 'Condicionamento',     'Intermediário','inst-3', true,  false, 0),
  ('v12', 'Defesa de Arm Lock',               'Técnicas de defesa contra arm lock e kimura.',                                                                             'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=225&fit=crop',  '16:00', 'jiu-jitsu',  'Defesas',             'Intermediário','inst-1', true,  false, 0),
  ('v13', 'HIIT para Lutadores',              'Treino intervalado de alta intensidade focado em artes marciais.',                                                          'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop',  '28:00', 'jiu-jitsu',  'Condicionamento',     'Intermediário','inst-1', true,  false, 0),
  ('v14', 'Defesa de Estrangulamento',         'Como escapar dos principais estrangulamentos.',                                                                            'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=225&fit=crop',  '15:30', 'jiu-jitsu',  'Defesas',             'Avançado',     'inst-1', true,  true,  60)
on conflict (id) do nothing;
