-- ============================================================
--  RastaHale Academy — Schema inicial
--  Cole e execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ---------- Tabela: instructors ----------
create table if not exists public.instructors (
  id          text primary key,
  name        text not null,
  avatar_url  text,
  bio         text,
  created_at  timestamptz default now()
);

-- ---------- Tabela: plans ----------
create table if not exists public.plans (
  id          text primary key,
  name        text not null,
  price       numeric(10,2) not null,
  interval    text not null check (interval in ('mensal','trimestral','anual')),
  features    text[] default '{}',
  active      boolean default true,
  categories  text[] default '{}',
  max_level   text not null check (max_level in ('Iniciante','Intermediário','Avançado')),
  created_at  timestamptz default now()
);

-- ---------- Tabela: videos ----------
create table if not exists public.videos (
  id                  text primary key,
  title               text not null,
  description         text,
  thumbnail           text,
  video_url           text,
  duration            text not null,
  category            text not null check (category in ('jiu-jitsu','luta-livre')),
  subcategory         text not null,
  level               text not null check (level in ('Iniciante','Intermediário','Avançado')),
  instructor_id       text references public.instructors(id),
  visible             boolean default true,
  unlock_by_progress  boolean default false,
  required_progress   integer default 0,
  created_at          timestamptz default now()
);

-- ---------- Tabela: profiles (estende auth.users) ----------
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  email           text not null,
  name            text not null,
  avatar_url      text,
  plan_name       text default 'Básico',
  status          text default 'ativo' check (status in ('ativo','inativo','pendente')),
  role            text default 'user'  check (role  in ('user','admin')),
  join_date       date default current_date,
  last_access     date default current_date,
  videos_watched  integer default 0,
  total_hours     numeric(10,2) default 0
);

-- ---------- Tabela: payments ----------
create table if not exists public.payments (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid references public.profiles(id),
  user_name   text not null,
  amount      numeric(10,2) not null,
  method      text not null check (method in ('PIX','Cartão','Boleto')),
  status      text not null check (status in ('pago','pendente','falhou')),
  date        date default current_date,
  plan_name   text not null,
  created_at  timestamptz default now()
);

-- ---------- Tabela: user_progress ----------
create table if not exists public.user_progress (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade,
  video_id         text references public.videos(id) on delete cascade,
  progress         integer default 0 check (progress >= 0 and progress <= 100),
  watched          boolean default false,
  is_favorite      boolean default false,
  last_watched_at  timestamptz default now(),
  unique(user_id, video_id)
);

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.instructors    enable row level security;
alter table public.videos         enable row level security;
alter table public.plans          enable row level security;
alter table public.profiles       enable row level security;
alter table public.payments       enable row level security;
alter table public.user_progress  enable row level security;

-- instructors
create policy "Leitura de instrutores" on public.instructors
  for select to authenticated using (true);

create policy "Admin gerencia instrutores" on public.instructors
  for all to authenticated
  using  (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- videos
create policy "Leitura de videos visiveis" on public.videos
  for select to authenticated
  using (visible = true or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin gerencia videos" on public.videos
  for all to authenticated
  using  (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- plans
create policy "Leitura de planos ativos" on public.plans
  for select to authenticated
  using (active = true or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin gerencia planos" on public.plans
  for all to authenticated
  using  (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- profiles
create policy "Usuario le proprio perfil" on public.profiles
  for select to authenticated
  using (id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Usuario insere proprio perfil" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "Usuario atualiza proprio perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Admin gerencia perfis" on public.profiles
  for all to authenticated
  using  (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- payments
create policy "Usuario le proprios pagamentos" on public.payments
  for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin gerencia pagamentos" on public.payments
  for all to authenticated
  using  (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- user_progress
create policy "Usuario gerencia proprio progresso" on public.user_progress
  for all to authenticated
  using  (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (user_id = auth.uid());

-- ============================================================
--  Funcoes auxiliares
-- ============================================================

create or replace function public.get_user_overall_progress(p_user_id uuid)
returns integer language sql security definer as $$
  select case when count(*) = 0 then 0
    else round(count(*) filter (where up.watched) * 100.0 / count(*))::integer
  end
  from public.videos v
  left join public.user_progress up on up.video_id = v.id and up.user_id = p_user_id
  where v.visible = true;
$$;

-- Trigger: cria perfil automaticamente ao registrar novo usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
