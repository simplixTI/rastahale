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
        // Compra avulsa de módulo (migration 022): não há assinatura, a
        // liberação acontece aqui.
        if (session.metadata?.kind === "module") await grantModule(session);
        else if (typeof session.customer === "string") {
          await linkCustomer(session.customer, session.customer_details?.email ?? session.customer_email);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Refaz o retrieve pra garantir o estado ATUAL da subscription.
        // Eventos podem chegar fora de ordem (o `created` pode chegar depois
        // do `updated` de active), e o payload do evento é snapshot antigo.
        const eventSub = event.data.object;
        const fresh = await stripe.subscriptions.retrieve(eventSub.id).catch(() => eventSub);
        await syncSubscription(fresh);
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
        await supabaseAdmin.from("stripe_pending_access").delete().eq("stripe_customer_id", sub.customer as string);
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
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id;
  if (!priceId) {
    console.warn("[stripe-webhook] subscription sem price_id:", sub.id);
    return;
  }

  // Descobre o plano via price_id (inclui histórico pra assinaturas legadas).
  const { data: planIdRow, error: rpcErr } = await supabaseAdmin
    .rpc("plan_id_by_stripe_price", { price_id: priceId });
  if (rpcErr) console.warn("[stripe-webhook] RPC plan_id_by_stripe_price:", rpcErr.message);

  const planId = typeof planIdRow === "string" ? planIdRow : null;
  let { data: plan } = planId
    ? await supabaseAdmin.from("plans").select("name").eq("id", planId).maybeSingle()
    : { data: null };
  // Preço que não está em plans (ex.: link de pagamento criado direto no
  // Stripe para uma promoção): escolhe o plano ativo de mesmo intervalo.
  if (!plan) plan = await planByInterval(item?.price?.recurring?.interval);

  // API 2025+: current_period_end saiu do topo da subscription e foi para o item.
  // Fallback: usa o topo se ainda existir (versões antigas ou compatibilidade).
  const itemPeriodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end;
  const subPeriodEnd = (sub as { current_period_end?: number }).current_period_end;
  const periodEndUnix = itemPeriodEnd ?? subPeriodEnd;
  const currentPeriodEnd = typeof periodEndUnix === "number"
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  const linked = await linkCustomer(customerId);
  if (!linked) {
    // Pagou antes de ter conta: reserva o acesso pelo e-mail. O perfil já
    // nasce liberado no cadastro (migration 024).
    const customer = await stripe.customers.retrieve(customerId).catch(() => null);
    const email = customer && !("deleted" in customer && customer.deleted)
      ? (customer as Stripe.Customer).email?.trim().toLowerCase() : undefined;
    if (email && (sub.status === "active" || sub.status === "trialing")) {
      const { error } = await supabaseAdmin.from("stripe_pending_access").upsert({
        email,
        stripe_customer_id:     customerId,
        stripe_subscription_id: sub.id,
        plan_name:              plan?.name ?? null,
        current_period_end:     currentPeriodEnd,
      });
      if (error) throw error;
      console.log("[stripe-webhook] acesso reservado para cadastro futuro:", email, sub.id);
    } else {
      console.warn("[stripe-webhook] assinatura sem aluno no app:", sub.id, customerId);
    }
    return;
  }


  const updates: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    subscription_status:    sub.status,
    status:                 sub.status === "active" || sub.status === "trialing" ? "ativo" : "inativo",
  };
  if (plan?.name) updates.plan_name = plan.name;
  if (currentPeriodEnd) updates.current_period_end = currentPeriodEnd;

  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("stripe_customer_id", customerId);

  if (updateErr) {
    console.error("[stripe-webhook] falha ao atualizar profile:", updateErr.message, updates);
    throw updateErr;
  }

  console.log("[stripe-webhook] assinatura sincronizada:", sub.id, sub.status, "plan:", plan?.name ?? "(não encontrado)");
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

  await linkCustomer(customerId, invoice.customer_email);
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

/** Grava a compra avulsa do módulo e o pagamento. Idempotente: o Stripe pode reenviar o evento. */
async function grantModule(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") {
    console.warn("[stripe-webhook] módulo ainda não pago:", session.id, session.payment_status);
    return;
  }
  const userId   = session.metadata?.supabase_user_id;
  const moduleId = session.metadata?.module_id;
  if (!userId || !moduleId) {
    console.warn("[stripe-webhook] compra de módulo sem metadata:", session.id);
    return;
  }
  const amount = (session.amount_total ?? 0) / 100;

  const { error } = await supabaseAdmin.from("module_purchases").upsert({
    user_id:           userId,
    module_id:         moduleId,
    source:            "stripe",
    amount,
    stripe_session_id: session.id,
  }, { onConflict: "user_id,module_id", ignoreDuplicates: true });
  if (error) {
    console.error("[stripe-webhook] falha ao gravar compra de módulo:", error.message);
    throw error;
  }

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (paymentIntent) {
    const { data: existing } = await supabaseAdmin
      .from("payments").select("id").eq("stripe_payment_intent", paymentIntent).maybeSingle();
    if (existing) return;
  }

  const [{ data: profile }, { data: mod }] = await Promise.all([
    supabaseAdmin.from("profiles").select("name").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("studio_sessions").select("title").eq("id", moduleId).maybeSingle(),
  ]);

  await supabaseAdmin.from("payments").insert({
    user_id:               userId,
    user_name:             profile?.name ?? "",
    amount,
    method:                "Stripe",
    status:                "pago",
    plan_name:             `Módulo: ${mod?.title ?? moduleId}`,
    date:                  new Date((session.created ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    stripe_payment_intent: paymentIntent,
  });

  console.log("[stripe-webhook] módulo liberado:", moduleId, "para", userId);
}

/**
 * Garante que o cliente do Stripe está ligado a um aluno (profiles.stripe_customer_id).
 * O botão "Assinar" do site já grava esse vínculo antes do pagamento; quem paga
 * por um link de pagamento criado direto no Stripe chega sem ele. Nesse caso
 * achamos o aluno pelo e-mail usado no pagamento, só entre perfis ainda sem
 * cliente do Stripe (nunca troca o cliente de quem já tem um).
 * Devolve o id do perfil, ou null se não houver aluno com esse e-mail.
 */
async function linkCustomer(customerId: string, emailHint?: string | null): Promise<string | null> {
  const { data: current } = await supabaseAdmin
    .from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (current) return current.id;

  let email = emailHint?.trim();
  if (!email) {
    const customer = await stripe.customers.retrieve(customerId).catch(() => null);
    email = customer && !("deleted" in customer && customer.deleted)
      ? (customer as Stripe.Customer).email?.trim() : undefined;
  }
  if (!email) {
    console.warn("[stripe-webhook] cliente sem e-mail, não dá para achar o aluno:", customerId);
    return null;
  }

  const { data: matches } = await supabaseAdmin
    .from("profiles").select("id").ilike("email", email).is("stripe_customer_id", null).limit(2);
  if (!matches || matches.length !== 1) {
    console.warn("[stripe-webhook] nenhum aluno (ou mais de um) com o e-mail do pagamento:", email, customerId);
    return null;
  }

  const { error } = await supabaseAdmin
    .from("profiles").update({ stripe_customer_id: customerId })
    .eq("id", matches[0].id).is("stripe_customer_id", null);
  if (error) {
    console.error("[stripe-webhook] falha ao ligar cliente ao aluno:", error.message);
    throw error;
  }
  console.log("[stripe-webhook] cliente ligado ao aluno pelo e-mail:", customerId, matches[0].id);
  return matches[0].id;
}

/** Plano ativo com o mesmo intervalo do preço ("month" → mensal, "year" → anual). */
async function planByInterval(interval?: string | null): Promise<{ name: string } | null> {
  const wanted = interval === "year" ? "anual" : interval === "month" ? "mensal" : null;
  if (!wanted) return null;
  const { data } = await supabaseAdmin
    .from("plans").select("name").eq("active", true).eq("interval", wanted).limit(1).maybeSingle();
  return data ?? null;
}
