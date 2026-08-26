// POST /functions/v1/create-checkout
// Body: { planId: string }
// Retorna: { url: string } — URL da sessão de checkout do Stripe pra redirecionar o usuário.
//
// Fluxo:
//  1. Autentica o usuário via Supabase Auth (bearer token).
//  2. Busca o plano no Supabase e valida que ele tem stripe_price_id.
//  3. Garante que existe um Stripe customer pro usuário (cria se necessário).
//  4. Cria a sessão de checkout em modo `subscription`.
//  5. Devolve a URL — o cliente redireciona (window.location.href = url).
import { stripe, resolveAppUrl } from "../_shared/stripe.ts";
import { supabaseAdmin, requireUser } from "../_shared/supabase.ts";
import { handleCorsPreflight, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const { user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const planId: string | undefined = body?.planId;
    if (!planId) return json({ error: "planId obrigatório" }, { status: 400 });

    // Busca o plano
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("id, name, stripe_price_id, active")
      .eq("id", planId)
      .maybeSingle();
    if (planErr || !plan) return json({ error: "Plano não encontrado" }, { status: 404 });
    if (!plan.active) return json({ error: "Plano inativo" }, { status: 400 });
    if (!plan.stripe_price_id) {
      return json({ error: "Plano ainda não sincronizado com o Stripe" }, { status: 400 });
    }

    // Garante o Stripe customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, name, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        name:  profile?.name  ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Cria a sessão de checkout
    const appUrl = resolveAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      // Cartão + PIX. Se não tiver PIX ativado na conta, o Stripe simplesmente ignora.
      payment_method_types: ["card"],
      success_url: `${appUrl}/perfil/plano?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/perfil/plano?checkout=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: plan.id,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
      },
      locale: "pt-BR",
    });

    return json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[create-checkout] erro:", err);
    return json({ error: (err as Error).message }, { status: 500 });
  }
});
