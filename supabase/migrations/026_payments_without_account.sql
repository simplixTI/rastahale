-- ============================================================
--  026 — Pagamento registrado mesmo sem conta no app
--
--  Antes, payments.user_id era obrigatório: quem pagava pelo link do Stripe
--  (ou era ativado pelo admin) sem ter conta não entrava na receita do painel.
--  Agora o pagamento é gravado na hora com o e-mail, e é ligado à conta
--  quando a pessoa se cadastra com esse e-mail.
-- ============================================================

alter table public.payments
  alter column user_id drop not null,
  add column if not exists email text;

create index if not exists payments_email_unlinked_idx
  on public.payments (lower(email)) where user_id is null;

-- Cadastro: consome a reserva e liga os pagamentos feitos com este e-mail.
-- (Substitui a versão da 025, que gravava o pagamento manual só aqui.)
create or replace function public.finish_stripe_pending_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.stripe_pending_access%rowtype;
begin
  if coalesce(new.email, '') = '' then
    return null;
  end if;

  update public.payments
     set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);

  select * into g from public.stripe_pending_access where email = lower(new.email);
  if found and new.status = 'ativo' and new.current_period_end is not distinct from g.current_period_end then
    -- Reserva antiga da 025 ainda sem pagamento gravado.
    if g.amount is not null then
      insert into public.payments (user_id, user_name, email, amount, method, status, plan_name, date)
      values (new.id, coalesce(nullif(new.name, ''), g.email), g.email, g.amount,
              coalesce(g.method, 'PIX')::payment_method, 'pago', coalesce(g.plan_name, 'Plano') || ' (manual)', current_date);
    end if;
    delete from public.stripe_pending_access where email = g.email;
  end if;
  return null;
end;
$$;

-- Ativação manual: grava o pagamento na hora nos dois casos.
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
  else
    v_end := now() + v_step;

    insert into public.stripe_pending_access (email, stripe_customer_id, stripe_subscription_id, plan_name, current_period_end, source, amount, method)
    values (v_email, null, null, v_plan.name, v_end, 'manual', null, null)
    on conflict (email) do update
      set plan_name          = excluded.plan_name,
          current_period_end = excluded.current_period_end,
          source             = 'manual',
          amount             = null,
          method             = null;
  end if;

  insert into public.payments (user_id, user_name, email, amount, method, status, plan_name, date)
  values (v_prof.id, coalesce(nullif(v_prof.name, ''), v_email), v_email, p_amount,
          p_method::payment_method, 'pago', v_plan.name || ' (manual)', current_date);

  return query select (case when v_prof.id is null then 'reservado' else 'ativado' end)::text, v_end;
end;
$$;

-- Pagamentos do Stripe de 27/11/2026 que chegaram antes desta correção.
insert into public.payments (user_id, user_name, email, amount, method, status, plan_name, date, stripe_invoice_id)
select p.id, g.nome, g.email, g.valor, 'Stripe', 'pago', g.plano, date '2026-11-27', g.fatura
  from (values
    ('in_1UgXD0FMtaFzJ1c92fDIHamm', 'Silvio Matheus Azevedo Rocha',  'silviomatheus@icloud.com',                214.00, 'Premium Anual'),
    ('in_1UgSuzFMtaFzJ1c98V9k4T0K', 'Gustavo Siqueira',              'respawn1547@gmail.com',                    49.00, 'Premium Mensal'),
    ('in_1UgSaVFMtaFzJ1c92PfdF8qY', 'Pedro de almeida mello souza',  'pedroomelloo7@gmail.com',                 214.00, 'Premium Anual'),
    ('in_1UgSaIFMtaFzJ1c9DPVfxDMy', 'Felipe Navarrete Teuber',       'felipe.navarrete@lowtide.cl',             214.00, 'Premium Anual'),
    ('in_1UgSZVFMtaFzJ1c9xWBAZlUs', 'Lucas Simas',                   'lucasmanoeldeaguiarfariasimas@gmail.com',  49.00, 'Premium Mensal'),
    ('in_1UgRalFMtaFzJ1c9krsP92w1', 'Roger Vianna Hühn',             'rogerhuhngas@gmail.com',                  214.00, 'Premium Anual'),
    ('in_1UgQgMFMtaFzJ1c9eqN6qrGb', 'Lucas Viana',                   'lucassvsantos34@gmail.com',               214.00, 'Premium Anual')
  ) as g(fatura, nome, email, valor, plano)
  left join public.profiles p on lower(p.email) = g.email
 where not exists (select 1 from public.payments x where x.stripe_invoice_id = g.fatura);

-- André Costa Coelho foi reembolsado: sem acesso reservado.
delete from public.stripe_pending_access where email = 'andreccoelho2004@gmail.com';

insert into supabase_migrations.schema_migrations (version, name) values ('026','payments_without_account') on conflict do nothing;
