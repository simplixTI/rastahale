-- ============================================================
--  027 — Checkout do site pela Appmax (cartão e Pix)
--
--  O aluno paga dentro do site: o cartão é tokenizado no navegador pelo
--  Appmax JS e a Edge Function "appmax-checkout" cria cliente, pedido e
--  pagamento na Appmax. Cada pedido fica em appmax_orders, ligado ao aluno.
--
--  Quem libera o acesso é appmax_apply_order(), chamada pela Edge Function
--  só depois de ler o status do pedido na própria API da Appmax (nunca a
--  partir do que o navegador ou o webhook dizem).
--
--  Não há cobrança recorrente: cada pagamento aprovado libera um período
--  (1 mês ou 1 ano) e o acesso vence sozinho (job da migration 025).
--
--  Antes desta migration, rodar à parte:
--    alter type public.payment_method add value if not exists 'Appmax';
-- ============================================================

create table if not exists public.appmax_orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  plan_id             text not null references public.plans(id),
  amount              numeric(10,2) not null,
  method              text not null check (method in ('creditcard', 'pix')),
  appmax_customer_id  bigint,
  appmax_order_id     bigint unique,
  status              text not null default 'criando',   -- status da Appmax
  applied             boolean not null default false,     -- acesso já liberado
  refunded            boolean not null default false,     -- acesso já retirado
  pix_emv             text,
  pix_expires_at      timestamptz,
  error               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists appmax_orders_user_idx on public.appmax_orders (user_id, created_at desc);
create index if not exists appmax_orders_open_idx on public.appmax_orders (created_at) where not applied;

alter table public.appmax_orders enable row level security;

-- O aluno vê os próprios pedidos (tela de Pix); o admin vê todos. Quem grava
-- é a Edge Function, com service role.
drop policy if exists "appmax_orders_read" on public.appmax_orders;
create policy "appmax_orders_read" on public.appmax_orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Idempotência do pagamento de cada pedido.
alter table public.payments add column if not exists external_ref text;
create unique index if not exists payments_external_ref_uidx
  on public.payments (external_ref) where external_ref is not null;

-- ------------------------------------------------------------
-- Aplica o status lido na API da Appmax. Idempotente.
-- ------------------------------------------------------------
create or replace function public.appmax_apply_order(
  p_id          uuid,
  p_status      text,
  p_total_cents integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o      public.appmax_orders%rowtype;
  v_plan public.plans%rowtype;
  v_prof public.profiles%rowtype;
  v_step interval;
  v_start timestamptz := now();
  v_end  timestamptz;
begin
  select * into o from public.appmax_orders where id = p_id for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  update public.appmax_orders set status = p_status, updated_at = now() where id = p_id;

  -- Pago: libera o período (uma vez só).
  if p_status in ('aprovado', 'integrado', 'pendente_integracao') and not o.applied then
    select * into v_plan from public.plans where id = o.plan_id;
    select * into v_prof from public.profiles where id = o.user_id;
    v_step := case v_plan.interval
                when 'anual'      then interval '1 year'
                when 'trimestral' then interval '3 months'
                else interval '1 month'
              end;
    if v_prof.status = 'ativo' and v_prof.subscription_source in ('manual', 'appmax')
       and v_prof.current_period_end > now() then
      v_start := v_prof.current_period_end;
    end if;
    v_end := v_start + v_step;

    update public.profiles
       set status              = 'ativo',
           plan_name           = v_plan.name,
           subscription_status = 'active',
           subscription_source = 'appmax',
           current_period_end  = v_end
     where id = o.user_id;

    insert into public.payments (user_id, user_name, email, amount, method, status, plan_name, date, external_ref)
    values (o.user_id, coalesce(nullif(v_prof.name, ''), v_prof.email), v_prof.email,
            coalesce(nullif(p_total_cents, 0)::numeric / 100, o.amount),
            'Appmax', 'pago', v_plan.name, current_date, 'appmax:' || o.appmax_order_id)
    on conflict (external_ref) where external_ref is not null do nothing;

    update public.appmax_orders set applied = true where id = p_id;
    return 'liberado';
  end if;

  -- Estorno, chargeback ou recusa por risco depois de liberado: retira.
  if p_status in ('estornado', 'recusado_por_risco', 'chargeback_em_tratativa', 'chargeback_perdido')
     and o.applied and not o.refunded then
    update public.payments set status = 'falhou'
     where external_ref = 'appmax:' || o.appmax_order_id;
    update public.profiles
       set status = 'inativo', subscription_status = 'canceled', current_period_end = now()
     where id = o.user_id and subscription_source = 'appmax';
    update public.appmax_orders set refunded = true where id = p_id;
    return 'retirado';
  end if;

  return 'sem_mudanca';
end;
$$;

revoke all on function public.appmax_apply_order(uuid, text, integer) from public, anon, authenticated;

-- O vencimento diário (025) passa a valer também para quem pagou pela Appmax.
create or replace function public.expire_manual_access()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set status = 'inativo', subscription_status = 'expired'
   where subscription_source in ('manual', 'appmax')
     and status = 'ativo'
     and current_period_end is not null
     and current_period_end < now();
$$;

revoke all on function public.expire_manual_access() from public, anon, authenticated;

insert into supabase_migrations.schema_migrations (version, name) values ('027','appmax_checkout') on conflict do nothing;
