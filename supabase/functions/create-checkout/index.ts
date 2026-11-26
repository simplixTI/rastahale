// POST /functions/v1/create-checkout
// Body: { planId: string }                          → assinatura do plano
//    ou { moduleId: string, returnPath?: string }   → compra avulsa de um módulo (pagamento único)
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
    if (body?.moduleId) return await moduleCheckout(req, user, String(body.moduleId), body?.returnPath);
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

    const customerId = await ensureCustomer(user);

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

type AuthUser = { id: string; email?: string | null };

/** Devolve o customer do Stripe do aluno, criando na primeira compra. */
async function ensureCustomer(user: AuthUser): Promise<string> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, name, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: profile?.email ?? user.email ?? undefined,
    name:  profile?.name  ?? undefined,
    metadata: { supabase_user_id: user.id },
  });
  await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);
  return customer.id;
}

/**
 * Compra avulsa de módulo (migration 022): pagamento único, acesso vitalício.
 * O preço vem do banco (studio_sessions.price), nunca do navegador. Quem grava
 * a compra é o webhook, no evento checkout.session.completed.
 */
async function moduleCheckout(req: Request, user: AuthUser, moduleId: string, returnPath: unknown): Promise<Response> {
  const { data: mod, error } = await supabaseAdmin
    .from("studio_sessions")
    .select("id, title, price, instructor_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (error || !mod) return json({ error: "Módulo não encontrado" }, { status: 404 });
  const price = Number(mod.price);
  if (!price || price <= 0) return json({ error: "Este módulo não está à venda" }, { status: 400 });

  const { data: owned } = await supabaseAdmin
    .from("module_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("module_id", mod.id)
    .maybeSingle();
  if (owned) return json({ error: "Você já comprou este módulo" }, { status: 400 });

  const { data: instructor } = await supabaseAdmin
    .from("instructors")
    .select("name")
    .eq("id", mod.instructor_id)
    .maybeSingle();

  // Volta para a tela de onde o aluno saiu. Só caminho interno ("/..."),
  // nunca outro site.
  const path = typeof returnPath === "string" && /^\/(?!\/)[^\s]*$/.test(returnPath) ? returnPath : "/";
  const back = (flag: string) => `${resolveAppUrl(req)}${path}${path.includes("?") ? "&" : "?"}compra=${flag}`;

  const customerId = await ensureCustomer(user);
  const metadata = { kind: "module", supabase_user_id: user.id, module_id: mod.id };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "brl",
        unit_amount: Math.round(price * 100),
        product_data: {
          name: `Módulo: ${mod.title}`,
          description: instructor?.name ? `Acesso vitalício · ${instructor.name}` : "Acesso vitalício",
        },
      },
    }],
    payment_method_types: ["card"],
    success_url: back("ok"),
    cancel_url:  back("cancelada"),
    payment_intent_data: { metadata },
    metadata,
    locale: "pt-BR",
  });

  return json({ url: session.url });
}
