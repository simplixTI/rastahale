// POST /functions/v1/revenuecat-webhook
// Recebe os eventos do RevenueCat (compras feitas dentro do app, pela App
// Store ou Google Play) e mantém profiles.status — a mesma coluna que o
// stripe-webhook mantém para as assinaturas da web.
//
// Configuração no RevenueCat → Project → Integrations → Webhooks:
//   URL: https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header: um segredo longo inventado por você
//   Ambiente: Production E Sandbox (a revisão da Apple compra em sandbox)
// Grave o mesmo segredo na função:
//   npx supabase secrets set REVENUECAT_WEBHOOK_AUTH=<segredo>
// Deploy:
//   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// O app configura o RevenueCat com appUserID = id do usuário no Supabase
// (src/lib/purchases.ts); é assim que o evento encontra o perfil.
import { supabaseAdmin } from "../_shared/supabase.ts";

const WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RcEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  expiration_at_ms?: number | null;
  store?: string;
  environment?: string;
}

// Eventos que deixam (ou mantêm) a assinatura em vigor.
const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!WEBHOOK_AUTH) {
    console.error("[revenuecat-webhook] REVENUECAT_WEBHOOK_AUTH não configurado");
    return new Response("Webhook secret ausente", { status: 500 });
  }
  if (req.headers.get("Authorization") !== WEBHOOK_AUTH) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: RcEvent;
  try {
    event = (await req.json()).event;
    if (!event?.type) throw new Error("payload sem event.type");
  } catch (err) {
    return new Response(`Payload inválido: ${(err as Error).message}`, { status: 400 });
  }

  try {
    await handle(event);
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // 500 faz o RevenueCat reenviar o evento mais tarde.
    console.error("[revenuecat-webhook] erro:", (err as Error).message, event.type);
    return new Response(`Erro: ${(err as Error).message}`, { status: 500 });
  }
});

async function handle(event: RcEvent): Promise<void> {
  if (event.type === "TEST") {
    console.log("[revenuecat-webhook] evento de teste recebido");
    return;
  }

  // O id do Supabase pode vir em qualquer um destes campos (compra feita
  // antes do login no RevenueCat gera um id anônimo com o uuid como alias).
  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]
    .find((id) => !!id && UUID.test(id));
  if (!userId) {
    console.warn("[revenuecat-webhook] evento sem id de usuário do Supabase:", event.type);
    return;
  }

  const { data: profile, error: readErr } = await supabaseAdmin
    .from("profiles")
    .select("id, current_period_end, subscription_source")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!profile) {
    console.warn("[revenuecat-webhook] perfil não encontrado:", userId, event.type);
    return;
  }

  const source = event.store === "PLAY_STORE" ? "play_store" : "app_store";
  const expiresAt = typeof event.expiration_at_ms === "number"
    ? new Date(event.expiration_at_ms)
    : null;
  const stillValid = !!expiresAt && expiresAt.getTime() > Date.now();

  let updates: Record<string, unknown> | null = null;

  if (ACTIVE_EVENTS.has(event.type)) {
    updates = { status: "ativo", subscription_status: "active", subscription_source: source };
    if (expiresAt) updates.current_period_end = expiresAt.toISOString();
    const productId = event.type === "PRODUCT_CHANGE"
      ? event.new_product_id ?? event.product_id
      : event.product_id;
    const planName = await planNameFor(productId);
    if (planName) updates.plan_name = planName;
  } else if (event.type === "CANCELLATION") {
    // Cancelou a renovação: o acesso segue até o fim do período pago. Com
    // reembolso a loja encerra na hora (expiração já no passado).
    updates = stillValid
      ? { subscription_status: "canceled", subscription_source: source }
      : { status: "inativo", subscription_status: "canceled", subscription_source: source };
  } else if (event.type === "BILLING_ISSUE") {
    // Falha de cobrança: a loja ainda tenta de novo; o acesso só cai no EXPIRATION.
    updates = { subscription_status: "past_due", subscription_source: source };
  } else if (event.type === "EXPIRATION") {
    // Não derruba quem tem o período estendido por outra origem (ex.: assinou
    // pelo site depois): nesse caso current_period_end está além desta expiração.
    const currentEnd = profile.current_period_end ? new Date(profile.current_period_end).getTime() : 0;
    const eventEnd = expiresAt ? expiresAt.getTime() : Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    if (currentEnd > eventEnd + DAY && currentEnd > Date.now()) {
      console.log("[revenuecat-webhook] EXPIRATION ignorado: período em vigor por outra origem", userId);
      return;
    }
    updates = { status: "inativo", subscription_status: "expired", subscription_source: source };
  } else {
    console.log("[revenuecat-webhook] evento ignorado:", event.type);
    return;
  }

  const { error: updateErr } = await supabaseAdmin.from("profiles").update(updates).eq("id", userId);
  if (updateErr) throw updateErr;
  console.log("[revenuecat-webhook]", event.type, event.environment ?? "", userId, JSON.stringify(updates));
}

async function planNameFor(productId: string | undefined): Promise<string | null> {
  if (!productId) return null;
  // No Google Play o product_id pode vir como "produto:plano-base".
  const base = productId.split(":")[0];
  const { data } = await supabaseAdmin
    .from("plans")
    .select("name")
    .eq("iap_product_id", base)
    .maybeSingle();
  if (!data?.name) console.warn("[revenuecat-webhook] nenhum plano com iap_product_id =", base);
  return data?.name ?? null;
}
