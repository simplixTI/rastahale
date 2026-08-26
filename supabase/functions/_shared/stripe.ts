// Cliente Stripe compartilhado entre todas as edge functions.
// Usa fetch nativo do Deno (não precisa do adaptador Node do SDK).
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
if (!STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY não definida — as chamadas vão falhar.");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

// URL base pra redirecionar o usuário depois do checkout/portal.
// Preferência: origem da requisição (Origin/Referer) — assim funciona em
// localhost E em produção sem trocar secret. Fallback pro APP_URL do env.
export function resolveAppUrl(req: Request): string {
  const origin = req.headers.get("Origin");
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  const referer = req.headers.get("Referer");
  if (referer) {
    try { return new URL(referer).origin; } catch { /* ignora */ }
  }
  return (Deno.env.get("APP_URL") ?? "http://localhost:8080").replace(/\/$/, "");
}

export const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";
