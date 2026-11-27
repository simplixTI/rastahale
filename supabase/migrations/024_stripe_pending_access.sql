-- ============================================================
--  024 — Acesso pago antes do cadastro
--
--  Quem paga por um link de pagamento criado direto no Stripe pode ainda não
--  ter conta no app. O webhook guarda o acesso aqui, pelo e-mail do pagamento,
--  e o perfil já nasce liberado quando a pessoa se cadastra com esse e-mail
--  (e-mail/senha ou Google).
-- ============================================================

create table if not exists public.stripe_pending_access (
  email                  text primary key,          -- sempre em minúsculas
  stripe_customer_id     text not null,
  stripe_subscription_id text,
  plan_name              text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now()
);

-- Só a service role (webhook) e o SQL Editor mexem aqui.
alter table public.stripe_pending_access enable row level security;

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

  delete from public.stripe_pending_access where email = g.email;
  return new;
end;
$$;

drop trigger if exists profiles_apply_stripe_pending on public.profiles;
create trigger profiles_apply_stripe_pending
  before insert on public.profiles
  for each row execute function public.apply_stripe_pending_access();

-- Pagamentos da Black Friday (27/11/2026) feitos antes de a pessoa ter conta.
insert into public.stripe_pending_access (email, stripe_customer_id, stripe_subscription_id, plan_name, current_period_end) values
  ('respawn1547@gmail.com',     'cus_Vhsg2uaSp3r8GN', 'sub_1UgSv2FMtaFzJ1c91fcN94Pe', 'Premium Mensal', '2026-12-27'),
  ('pedroomelloo7@gmail.com',   'cus_VhsLaGqWjkMeJv', 'sub_1UgSaXFMtaFzJ1c9McyaAio2', 'Premium Anual',  '2027-11-27'),
  ('andreccoelho2004@gmail.com','cus_Vhs0PfmzgMgvh1', 'sub_1UgSGkFMtaFzJ1c9z9lGyA3c', 'Premium Anual',  '2027-11-27'),
  ('rogerhuhngas@gmail.com',    'cus_VhrJ9J2tRglJOA', 'sub_1UgRcaFMtaFzJ1c9QEg6SJ5e', 'Premium Anual',  '2027-11-27'),
  ('lucassvsantos34@gmail.com', 'cus_VhqNYbg9GqrIZV', 'sub_1UgQhjFMtaFzJ1c9YXsgkLzn', 'Premium Anual',  '2027-11-27')
on conflict (email) do nothing;

insert into supabase_migrations.schema_migrations (version, name) values ('024','stripe_pending_access') on conflict do nothing;
