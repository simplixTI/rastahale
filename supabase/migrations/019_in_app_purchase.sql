-- ============================================================
--  019 — Compra dentro do app (App Store / Google Play via RevenueCat)
--  Nada é removido: Stripe (web) continua funcionando igual.
-- ============================================================

-- plans: id do produto na loja (ex.: "rastahale_premium_mensal"). É o mesmo
-- Product ID criado no App Store Connect / Play Console; o webhook do
-- RevenueCat usa esta coluna para descobrir o nome do plano.
alter table public.plans
  add column if not exists iap_product_id text;

create index if not exists plans_iap_product_id_idx on public.plans(iap_product_id);

-- profiles: de onde veio a assinatura em vigor quando ela foi comprada no app
-- ('app_store' | 'play_store'). Fica null para assinaturas do Stripe ou
-- acesso liberado pelo admin.
alter table public.profiles
  add column if not exists subscription_source text;
