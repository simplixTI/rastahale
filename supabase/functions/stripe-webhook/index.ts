// POST /functions/v1/stripe-webhook
// Recebe eventos do Stripe e atualiza o banco.
//
// Configuração no Stripe Dashboard → Developers → Webhooks → Add endpoint:
//   URL: https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
//   Eventos:
//     - checkout.session.completed
//     - customer.subscription.created
//     - customer.subscription.updated
//     - customer.subscription.deleted
//     - invoice.paid
//     - invoice.payment_failed
//
// Depois copie o "Signing secret" e configure como STRIPE_WEBHOOK_SECRET
// nas variáveis de ambiente da função (supabase functions secrets set).
//
// Importante: esta função NÃO deve exigir JWT (é o Stripe quem chama).
// Configure no supabase/config.toml: [functions.stripe-webhook] verify_jwt = false
import type Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { stripe } from "../_shared/stripe.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!WEBHOOK_SECRET) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET não configurado");
    return new Response("Webhook secret ausente", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Assinatura ausente", { status: 400 });

  const rawBody = await req.text();

  let event;
  try {
    // Precisa ser async no Deno porque o Web Crypto API é assíncrono.
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] assinatura inválida:", (err as Error).message);
    return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // A sessão foi paga — o Stripe já criou a assinatura, o evento
        // customer.subscription.created cuida do resto.
        const session = event.data.object;
        console.log("[stripe-webhook] checkout completo:", session.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        await syncSubscription(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            stripe_subscription_id: null,
            status: "inativo",
          })
          .eq("stripe_customer_id", sub.customer as string);
        console.log("[stripe-webhook] assinatura cancelada:", sub.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        await recordPayment(invoice, "pago");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await recordPayment(invoice, "falhou");
        break;
      }

      default:
        // Silencioso pra não poluir os logs.
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-webhook] erro ao processar", event.type, err);
    return new Response(`Erro: ${(err as Error).message}`, { status: 500 });
  }
});

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = sub.customer as string;
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return;

  // Descobre o plano via price_id (inclui histórico pra assinaturas legadas).
  const { data: planIdRow } = await supabaseAdmin
    .rpc("plan_id_by_stripe_price", { price_id: priceId });

  const planId = typeof planIdRow === "string" ? planIdRow : null;
  const { data: plan } = planId
    ? await supabaseAdmin.from("plans").select("name").eq("id", planId).maybeSingle()
    : { data: null };

  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_subscription_id: sub.id,
      subscription_status:    sub.status,
      current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
      plan_name:              plan?.name ?? undefined,
      status:                 sub.status === "active" || sub.status === "trialing" ? "ativo" : "inativo",
    })
    .eq("stripe_customer_id", customerId);

  console.log("[stripe-webhook] assinatura sincronizada:", sub.id, sub.status);
}

async function recordPayment(invoice: Stripe.Invoice, status: "pago" | "falhou"): Promise<void> {
  const customerId = invoice.customer as string;
  const invoiceId  = invoice.id as string;

  // Idempotência: se já registramos essa fatura, ignora.
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("stripe_invoice_id", invoiceId)
    .maybeSingle();
  if (existing) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, name")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) {
    console.warn("[stripe-webhook] fatura sem perfil correspondente:", invoiceId);
    return;
  }

  const amount = (invoice.amount_paid ?? invoice.amount_due ?? 0) / 100;
  const planName = invoice.lines?.data?.[0]?.description
    ?? invoice.lines?.data?.[0]?.price?.nickname
    ?? "Assinatura";

  await supabaseAdmin.from("payments").insert({
    user_id:                profile.id,
    user_name:              profile.name,
    amount,
    method:                 "Stripe",
    status,
    plan_name:              planName,
    date:                   new Date((invoice.created ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    stripe_invoice_id:      invoiceId,
    stripe_subscription_id: invoice.subscription as string | null,
    stripe_payment_intent:  invoice.payment_intent as string | null,
  });

  console.log("[stripe-webhook] pagamento registrado:", invoiceId, status);
}
