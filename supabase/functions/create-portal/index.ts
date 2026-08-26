// POST /functions/v1/create-portal
// Retorna: { url: string } — URL do portal do cliente Stripe.
//
// O portal permite o usuário: ver histórico, trocar cartão, cancelar assinatura,
// baixar recibos. Toda mudança feita lá é refletida via webhook.
import { stripe, resolveAppUrl } from "../_shared/stripe.ts";
import { supabaseAdmin, requireUser } from "../_shared/supabase.ts";
import { handleCorsPreflight, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const { user } = await requireUser(req);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return json({ error: "Usuário sem assinatura Stripe ativa" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${resolveAppUrl(req)}/perfil/plano`,
    });

    return json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[create-portal] erro:", err);
    return json({ error: (err as Error).message }, { status: 500 });
  }
});
