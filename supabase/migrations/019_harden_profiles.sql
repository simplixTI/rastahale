-- ============================================================
-- 019 — Fecha duas escaladas de privilégio em `profiles`
--
-- (A) Cadastro com papel escolhido pelo próprio usuário.
--     handle_new_user lia `raw_user_meta_data->>'role'`. Esse campo é gravado
--     pelo próprio visitante no signUp:
--         supabase.auth.signUp({ email, password, options: { data: { role: 'admin' } } })
--     Com o cadastro aberto (config.toml: enable_signup = true) e só a anon key,
--     qualquer pessoa criava uma conta admin. Agora o trigger ignora o metadata
--     e sempre cria 'user'. O papel só muda por quem tem service role
--     (Edge Function admin-instructors, scripts de seed) ou por um admin logado.
--
-- (B) Aluno editando a própria linha em `profiles`.
--     A policy de UPDATE ("Usuario atualiza proprio perfil" / profiles_update_own)
--     libera a linha inteira para o dono, sem restringir colunas. Pela anon key
--     + o próprio JWT, o aluno rodava:
--         update profiles set role = 'admin'   where id = auth.uid();   -- vira admin
--         update profiles set status = 'ativo' where id = auth.uid();   -- aula grátis
--     (bunny-stream libera o vídeo olhando profiles.status). O trigger abaixo
--     barra a troca de role, status, plano, email e dos campos do Stripe quando
--     quem escreve é um usuário comum.
--
--     Continuam liberados para o aluno: name, avatar_url, last_access,
--     videos_watched, total_hours (o app grava esses).
--
-- Quem continua podendo escrever tudo:
--   • service role (Edge Functions, webhook do Stripe, scripts) — auth.uid() é NULL;
--   • SQL Editor / migrations — auth.uid() é NULL;
--   • admin logado no painel — public.is_admin().
--
-- Reversão: drop trigger trg_protect_profile_columns on public.profiles;
--           (e recriar handle_new_user da 017 se quiser o comportamento antigo).
--
-- Verificação depois de aplicar: supabase/tests/019_profiles_security.sql
-- ============================================================

-- Pré-condição: as colunas do Stripe (migration 018) precisam existir. O trigger
-- as compara em todo UPDATE de profiles; sem elas, TODO update de perfil falharia.
do $$
declare
  missing text;
begin
  select string_agg(c, ', ') into missing
  from unnest(array[
    'stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'current_period_end'
  ]) as c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = c
  );
  if missing is not null then
    raise exception 'Aplique a migration 018 antes: faltam as colunas % em public.profiles', missing;
  end if;
end $$;

-- (A) handle_new_user: nunca confia em raw_user_meta_data->>'role' ---------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email, name, role)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
      'user'
    )
    on conflict (id) do nothing;
  exception when others then
    -- Nunca deixar o insert do profile derrubar a criação do usuário.
    raise warning 'handle_new_user: falha ao criar profile de %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- (B) Trava as colunas de privilégio e de cobrança ----------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Service role, SQL Editor e triggers internos não carregam o JWT de um usuário.
  if auth.uid() is null then
    return new;
  end if;

  -- Admin logado no painel pode tudo.
  if public.is_admin() then
    return new;
  end if;

  -- Usuário comum criando a própria linha (ensureProfile): nasce como aluno sem
  -- assinatura, qualquer que seja o payload.
  if tg_op = 'INSERT' then
    new.role                   := 'user';
    new.status                 := 'pendente';
    new.plan_name              := 'Básico';
    new.subscription_status    := null;
    new.stripe_customer_id     := null;
    new.stripe_subscription_id := null;
    new.current_period_end     := null;
    return new;
  end if;

  if new.id                     is distinct from old.id
  or new.role                   is distinct from old.role
  or new.status                 is distinct from old.status
  or new.plan_name              is distinct from old.plan_name
  or new.email                  is distinct from old.email
  or new.subscription_status    is distinct from old.subscription_status
  or new.stripe_customer_id     is distinct from old.stripe_customer_id
  or new.stripe_subscription_id is distinct from old.stripe_subscription_id
  or new.current_period_end     is distinct from old.current_period_end
  then
    raise exception 'Sem permissão para alterar estes campos do perfil'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_columns();
