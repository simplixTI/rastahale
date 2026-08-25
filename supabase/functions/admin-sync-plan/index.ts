// POST /functions/v1/admin-sync-plan
// Body: { planId: string }
// Cria/atualiza o produto e o preço no Stripe pra um plano do banco.
//
// Regras:
//  - Se o plano não tem stripe_product_id, cria produto e preço novos.
//  - Se já tem produto mas o preço mudou (valor ou intervalo), arquiva o preço
//    antigo e cria um novo (Stripe prices são imutáveis).
//  - Só admins podem chamar (checado via requireAdmin).
import { stripe } from "../_shared/stripe.ts";
import { supabaseAdmin, requireAdmin } from "../_shared/supabase.ts";
import { handleCorsPreflight, json } from "../_shared/cors.ts";

type Interval = "mensal" | "trimestral" | "anual";

function toStripeInterval(interval: Interval): { interval: "month" | "year"; interval_count: number } {
  switch (interval) {
    case "mensal":       return { interval: "month", interval_count: 1 };
    case "trimestral":   return { interval: "month", interval_count: 3 };
    case "anual":        return { interval: "year",  interval_count: 1 };
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const planId: string | undefined = body?.planId;
    if (!planId) return json({ error: "planId obrigatório" }, { status: 400 });

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("id, name, price, interval, active, features, stripe_product_id, stripe_price_id, stripe_price_history")
      .eq("id", planId)
      .maybeSingle();

    if (error || !plan) return json({ error: "Plano não encontrado" }, { status: 404 });

    const description = plan.features?.length
      ? `Recursos: ${plan.features.join(", ")}`
      : undefined;

    // 1. Produto (cria uma vez, atualiza nome/descrição sempre)
    let productId = plan.stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({
        name: plan.name,
        description,
        active: plan.active,
        metadata: { plan_id: plan.id },
      });
      productId = product.id;
    } else {
      await stripe.products.update(productId, {
        name: plan.name,
        description,
        active: plan.active,
      });
    }

    // 2. Preço (imutável — cria novo se mudou; arquiva o antigo)
    const priceInBRL = Math.round(Number(plan.price) * 100);
    const recurring = toStripeInterval(plan.interval as Interval);

    let priceId = plan.stripe_price_id;
    let history: string[] = plan.stripe_price_history ?? [];

    let needNewPrice = !priceId;
    if (priceId) {
      const existing = await stripe.prices.retrieve(priceId);
      const sameAmount   = existing.unit_amount === priceInBRL;
      const sameCurrency = existing.currency === "brl";
      const sameInterval = existing.recurring?.interval === recurring.interval
                       && existing.recurring?.interval_count === recurring.interval_count;
      if (!(sameAmount && sameCurrency && sameInterval)) {
        // Arquiva o antigo, mantém no histórico pra reconhecer assinaturas legadas
        await stripe.prices.update(priceId, { active: false });
        history = Array.from(new Set([...history, priceId]));
        needNewPrice = true;
      }
    }

    if (needNewPrice) {
      const price = await stripe.prices.create({
        product: productId!,
        unit_amount: priceInBRL,
        currency: "brl",
        recurring,
        metadata: { plan_id: plan.id },
      });
      priceId = price.id;
    }

    // 3. Persiste no banco
    await supabaseAdmin
      .from("plans")
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
        stripe_price_history: history,
      })
      .eq("id", plan.id);

    return json({ ok: true, productId, priceId });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[admin-sync-plan] erro:", err);
    return json({ error: (err as Error).message }, { status: 500 });
  }
});
