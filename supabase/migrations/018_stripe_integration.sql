-- ============================================================
--  018 — Stripe integration
--  Adiciona colunas para conectar planos, perfis e pagamentos ao Stripe.
--  Nada é removido: o app continua funcionando sem Stripe configurado.
-- ============================================================

-- ---------- plans: identifica produto/preço no Stripe ----------
alter table public.plans
  add column if not exists stripe_product_id text,
  add column if not exists stripe_price_id   text;

-- Preços do Stripe são imutáveis — se o admin trocar o valor,
-- arquivamos o preço antigo e criamos um novo. Guardamos o histórico
-- num array para poder consultar assinaturas legadas.
alter table public.plans
  add column if not exists stripe_price_history text[] default '{}';

create index if not exists plans_stripe_price_id_idx on public.plans(stripe_price_id);

-- ---------- profiles: identifica o customer e a assinatura ativa ----------
alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text,          -- active, past_due, canceled, ...
  add column if not exists current_period_end     timestamptz;   -- quando a assinatura expira

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles(stripe_subscription_id);

-- ---------- payments: aceita método "Stripe" e liga ao invoice ----------
-- O bootstrap do projeto usava check constraint (migration 001), mas o
-- banco de produção pode ter migrado o campo para um enum `payment_method`.
-- Cobrimos os dois casos.
do $$
declare
  method_type text;
begin
  select data_type into method_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'payments'
    and column_name  = 'method';

  if method_type = 'USER-DEFINED' then
    -- Enum: adicionar o valor "Stripe" se ainda não existir.
    -- NB: ALTER TYPE ... ADD VALUE precisa rodar fora de uma transação em
    -- versões antigas do Postgres. No Supabase (PG 15+) funciona inline.
    begin
      alter type payment_method add value if not exists 'Stripe';
    exception when duplicate_object then
      null;
    end;
  else
    -- Text com check constraint: recriar a constraint com o valor extra.
    alter table public.payments drop constraint if exists payments_method_check;
    alter table public.payments
      add constraint payments_method_check
      check (method in ('PIX','Cartão','Boleto','Stripe'));
  end if;
end$$;

alter table public.payments
  add column if not exists stripe_invoice_id      text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_payment_intent  text;

create unique index if not exists payments_stripe_invoice_uidx
  on public.payments(stripe_invoice_id)
  where stripe_invoice_id is not null;

-- ---------- helper: encontrar plano por price_id (usado pelo webhook) ----------
create or replace function public.plan_id_by_stripe_price(price_id text)
returns text
language sql
stable
as $$
  select id
  from public.plans
  where stripe_price_id = price_id
     or price_id = any(stripe_price_history)
  limit 1;
$$;

-- ============================================================
--  RLS: leitura dos novos campos segue as políticas existentes.
--  Escrita nos campos stripe_* fica restrita ao service role,
--  usado apenas pelas Edge Functions (webhook, admin-sync-plan).
-- ============================================================
