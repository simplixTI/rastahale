-- ============================================================
--  025 — Ativação manual pelo admin (pagamento fora do Stripe)
--
--  O admin recebe um Pix, cartão na maquininha etc. e ativa o aluno no
--  plano mensal ou anual em /admin/ativacao. Se o aluno ainda não tem conta,
--  o acesso fica reservado pelo e-mail (stripe_pending_access, migration 024)
--  e o perfil já nasce liberado no cadastro.
--
--  Acesso manual tem data de fim (current_period_end). Um job diário do
--  pg_cron desativa quem passou da data. Assinaturas do Stripe e das lojas
--  continuam sendo controladas pelos webhooks e não entram nesse job.
-- ============================================================

-- A reserva passa a servir também para a ativação manual.
alter table public.stripe_pending_access
  alter column stripe_customer_id drop not null,
  add column if not exists source text not null default 'stripe',   -- 'stripe' | 'manual'
  -- Ativação manual de quem ainda não tem conta: o pagamento só pode ser
  -- gravado depois que o perfil existe (payments.user_id é obrigatório).
  add column if not exists amount numeric(10,2),
  add column if not exists method text;

-- Ao aplicar a reserva no cadastro, marca a origem do acesso.
create or replace function public.apply_stripe_pending_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.stripe_pending_access%rowtype;
begin
  if coalesce(new.email, '') = '' or new.stripe_customer_id is not null then
    return new;
  end if;
  select * into g from public.stripe_pending_access where email = lower(new.email);
  if not found then
    return new;
  end if;

  new.status                 := 'ativo';
  new.subscription_status    := 'active';
  new.stripe_customer_id     := g.stripe_customer_id;
  new.stripe_subscription_id := g.stripe_subscription_id;
  new.plan_name              := coalesce(g.plan_name, new.plan_name);
  new.current_period_end     := g.current_period_end;
  if g.source = 'manual' then
    new.subscription_source := 'manual';
  end if;
  return new;
end;
$$;

-- Depois do cadastro: grava o pagamento da ativação manual e consome a reserva.
create or replace function public.finish_stripe_pending_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.stripe_pending_access%rowtype;
begin
  select * into g from public.stripe_pending_access where email = lower(coalesce(new.email, ''));
  if not found or new.status <> 'ativo' or new.current_period_end is distinct from g.current_period_end then
    return null;
  end if;
  if g.amount is not null then
    insert into public.payments (user_id, user_name, amount, method, status, plan_name, date)
    values (new.id, coalesce(nullif(new.name, ''), g.email), g.amount,
            coalesce(g.method, 'PIX')::payment_method, 'pago', coalesce(g.plan_name, 'Plano') || ' (manual)', current_date);
  end if;
  delete from public.stripe_pending_access where email = g.email;
  return null;
end;
$$;

drop trigger if exists profiles_finish_stripe_pending on public.profiles;
create trigger profiles_finish_stripe_pending
  after insert on public.profiles
  for each row execute function public.finish_stripe_pending_access();

-- O admin vê e cancela reservas pela tela.
drop policy if exists "pending_access_admin" on public.stripe_pending_access;
create policy "pending_access_admin" on public.stripe_pending_access
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- Ativa (ou renova) o acesso. Devolve 'ativado' ou 'reservado'.
-- Renovação de quem ainda tem acesso manual soma a partir da data de fim atual.
-- ------------------------------------------------------------
create or replace function public.admin_grant_access(
  p_email   text,
  p_plan_id text,
  p_amount  numeric,
  p_method  text
)
returns table (result text, period_end timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := lower(trim(p_email));
  v_plan   public.plans%rowtype;
  v_step   interval;
  v_prof   public.profiles%rowtype;
  v_start  timestamptz := now();
  v_end    timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Apenas o admin pode ativar acessos';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Valor inválido';
  end if;
  if p_method not in ('PIX', 'Cartão', 'Boleto') then
    raise exception 'Forma de pagamento inválida';
  end if;

  select * into v_plan from public.plans where id = p_plan_id;
  if not found then
    raise exception 'Plano não encontrado';
  end if;
  v_step := case v_plan.interval
              when 'anual'      then interval '1 year'
              when 'trimestral' then interval '3 months'
              else interval '1 month'
            end;

  select * into v_prof from public.profiles where lower(email) = v_email limit 1;

  if found then
    if v_prof.status = 'ativo' and v_prof.subscription_source = 'manual'
       and v_prof.current_period_end > now() then
      v_start := v_prof.current_period_end;
    end if;
    v_end := v_start + v_step;

    update public.profiles
       set status              = 'ativo',
           plan_name           = v_plan.name,
           subscription_status = 'active',
           subscription_source = 'manual',
           current_period_end  = v_end
     where id = v_prof.id;

    insert into public.payments (user_id, user_name, amount, method, status, plan_name, date)
    values (v_prof.id, coalesce(nullif(v_prof.name, ''), v_email), p_amount,
            p_method::payment_method, 'pago', v_plan.name || ' (manual)', current_date);

    return query select 'ativado'::text, v_end;
  else
    v_end := now() + v_step;

    -- O pagamento entra em Pagamentos quando a conta for criada.
    insert into public.stripe_pending_access (email, stripe_customer_id, stripe_subscription_id, plan_name, current_period_end, source, amount, method)
    values (v_email, null, null, v_plan.name, v_end, 'manual', p_amount, p_method)
    on conflict (email) do update
      set plan_name          = excluded.plan_name,
          current_period_end = excluded.current_period_end,
          source             = 'manual',
          amount             = excluded.amount,
          method             = excluded.method;

    return query select 'reservado'::text, v_end;
  end if;
end;
$$;

revoke all on function public.admin_grant_access(text, text, numeric, text) from public, anon;
grant execute on function public.admin_grant_access(text, text, numeric, text) to authenticated;

-- Remove um acesso manual antes do fim (ex.: ativado por engano).
create or replace function public.admin_revoke_manual_access(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas o admin pode remover acessos';
  end if;
  update public.profiles
     set status = 'inativo', subscription_status = 'canceled', current_period_end = now()
   where id = p_user and subscription_source = 'manual';
end;
$$;

revoke all on function public.admin_revoke_manual_access(uuid) from public, anon;
grant execute on function public.admin_revoke_manual_access(uuid) to authenticated;

-- ------------------------------------------------------------
-- Vencimento diário do acesso manual.
-- ------------------------------------------------------------
create or replace function public.expire_manual_access()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set status = 'inativo', subscription_status = 'expired'
   where subscription_source = 'manual'
     and status = 'ativo'
     and current_period_end is not null
     and current_period_end < now();
$$;

revoke all on function public.expire_manual_access() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-manual-access';
select cron.schedule('expire-manual-access', '15 3 * * *', 'select public.expire_manual_access();');

insert into supabase_migrations.schema_migrations (version, name) values ('025','admin_manual_access') on conflict do nothing;
