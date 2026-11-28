// POST /functions/v1/appmax-checkout
// Checkout do site pela Appmax (migration 027). Ações (campo "action"):
//
//   config  → { externalId, scriptUrl }             (aluno logado)
//   pay     → cria cliente + pedido + pagamento      (aluno logado)
//             body: { planId, method: "creditcard"|"pix", ip, name, cpf, phone,
//                     cardToken?, holderName? }
//             devolve: { orderId, status, pix? }
//   status  → relê o pedido na Appmax e aplica       (aluno logado, só os próprios)
//             body: { orderId }
//
// Webhook da Appmax (painel → API → Webhooks):
//   POST /functions/v1/appmax-checkout?key=<APPMAX_WEBHOOK_KEY>
//   O corpo só serve para achar o pedido; o status sempre vem da API da Appmax.
//
// Secrets: APPMAX_CLIENT_ID, APPMAX_CLIENT_SECRET, APPMAX_EXTERNAL_ID,
//          APPMAX_WEBHOOK_KEY e, opcional, APPMAX_ENV=sandbox.
/* eslint-disable @typescript-eslint/no-explicit-any --
   respostas e webhooks da Appmax têm formatos variados e sem tipos oficiais;
   os campos são lidos com optional chaining e convertidos na hora. */
import { supabaseAdmin, requireUser } from "../_shared/supabase.ts";
import { handleCorsPreflight, json } from "../_shared/cors.ts";

const SANDBOX     = Deno.env.get("APPMAX_ENV") === "sandbox";
const AUTH_URL    = SANDBOX ? "https://auth.sandboxappmax.com.br/oauth2/token" : "https://auth.appmax.com.br/oauth2/token";
const API_URL     = SANDBOX ? "https://api.sandboxappmax.com.br" : "https://api.appmax.com.br";
const SCRIPT_URL  = SANDBOX ? "https://scripts.sandboxappmax.com.br/appmax.min.js" : "https://scripts.appmax.com.br/appmax.min.js";
const CLIENT_ID   = Deno.env.get("APPMAX_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("APPMAX_CLIENT_SECRET") ?? "";
const EXTERNAL_ID = Deno.env.get("APPMAX_EXTERNAL_ID") ?? "";
const WEBHOOK_KEY = Deno.env.get("APPMAX_WEBHOOK_KEY") ?? "";
const SOFT_DESCRIPTOR = "RASTAHALE";

// ── Token do merchant (vale 1 h; guardado enquanto a instância viver) ──────
let cachedToken: { value: string; expiresAt: number } | null = null;

async function appmaxToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    console.error("[appmax] falha ao autenticar:", res.status, body?.error ?? "");
    throw new Error("Pagamento indisponível no momento. Tente de novo em instantes.");
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}

class AppmaxError extends Error {
  constructor(message: string, public status: number, public body: unknown) { super(message); }
}

/** Primeira mensagem legível de um erro da Appmax (os formatos variam). */
function appmaxMessage(body: any): string {
  const m = body?.errors?.message ?? body?.error?.message ?? body?.message ?? body?.error;
  if (typeof m === "string") return m;
  if (m && typeof m === "object") {
    const first = Object.values(m).flat()[0];
    if (typeof first === "string") return first;
  }
  return "";
}

async function appmax(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const token = await appmaxToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[appmax] erro", init.method ?? "GET", path, res.status, JSON.stringify(body).slice(0, 800));
    throw new AppmaxError(appmaxMessage(body) || `Erro ${res.status} na Appmax`, res.status, body);
  }
  return body;
}

const onlyDigits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

/** "2026-11-28 15:00:00" (horário de Brasília) → ISO. */
function brasiliaToIso(s: unknown): string | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return null;
  return new Date(`${s.replace(" ", "T")}-03:00`).toISOString();
}

/** Lê o pedido na API da Appmax e aplica no banco. Devolve o status. */
async function refreshOrder(row: { id: string; appmax_order_id: number | null; status: string }): Promise<string> {
  if (!row.appmax_order_id) return row.status;
  const body = await appmax(`/v1/orders/${row.appmax_order_id}`);
  const order = body?.data?.order ?? {};
  const status = String(order.status ?? row.status);
  const total = Number(order.total_paid ?? 0) || 0;
  const { error } = await supabaseAdmin.rpc("appmax_apply_order", {
    p_id: row.id, p_status: status, p_total_cents: Math.round(total),
  });
  if (error) {
    console.error("[appmax] falha ao aplicar pedido:", row.id, error.message);
    throw error;
  }
  return status;
}

// ── Ações do aluno ─────────────────────────────────────────────────────────

async function pay(userId: string, userEmail: string, body: any): Promise<Response> {
  const method = body?.method === "pix" ? "pix" : body?.method === "creditcard" ? "creditcard" : null;
  if (!method) return json({ error: "Forma de pagamento inválida" }, { status: 400 });

  const name  = String(body?.name ?? "").trim().replace(/\s+/g, " ");
  const cpf   = onlyDigits(body?.cpf);
  const phone = onlyDigits(body?.phone);
  const ip    = String(body?.ip ?? "").trim();
  if (name.split(" ").length < 2) return json({ error: "Informe nome e sobrenome" }, { status: 400 });
  if (cpf.length !== 11 && cpf.length !== 14) return json({ error: "CPF inválido" }, { status: 400 });
  if (phone.length < 10) return json({ error: "Celular inválido" }, { status: 400 });
  if (!ip) return json({ error: "Não foi possível validar a conexão. Recarregue a página e tente de novo." }, { status: 400 });
  if (method === "creditcard" && !body?.cardToken) return json({ error: "Dados do cartão incompletos" }, { status: 400 });

  const { data: plan } = await supabaseAdmin
    .from("plans").select("id, name, price, active").eq("id", String(body?.planId ?? "")).maybeSingle();
  if (!plan || !plan.active) return json({ error: "Plano indisponível" }, { status: 400 });
  const cents = Math.round(Number(plan.price) * 100);

  const [firstName, ...rest] = name.split(" ");
  const customer = await appmax("/v1/customers", {
    body: {
      first_name: firstName,
      last_name: rest.join(" "),
      email: userEmail,
      phone,
      document_number: cpf,
      ip,
    },
  });
  const customerId = customer?.data?.customer?.id;
  if (!customerId) throw new Error("A Appmax não devolveu o cliente");

  const order = await appmax("/v1/orders", {
    body: {
      customer_id: customerId,
      products_value: cents,
      discount_value: 0,
      shipping_value: 0,
      products: [{ sku: `rastahale-${plan.id}`, name: `RastaHale Club - ${plan.name}`, quantity: 1, unit_value: cents, type: "digital" }],
    },
  });
  const appmaxOrderId = order?.data?.order?.id;
  if (!appmaxOrderId) throw new Error("A Appmax não devolveu o pedido");

  const { data: row, error: insErr } = await supabaseAdmin.from("appmax_orders").insert({
    user_id: userId,
    plan_id: plan.id,
    amount: Number(plan.price),
    method,
    appmax_customer_id: customerId,
    appmax_order_id: appmaxOrderId,
    status: "pendente",
  }).select("id, appmax_order_id, status").single();
  if (insErr) throw insErr;

  try {
    if (method === "creditcard") {
      await appmax("/v1/payments/credit-card", {
        body: {
          order_id: appmaxOrderId,
          customer_id: customerId,
          payment_data: {
            credit_card: {
              token: String(body.cardToken),
              holder_document_number: cpf,
              holder_name: String(body?.holderName ?? name).trim(),
              installments: 1,
              soft_descriptor: SOFT_DESCRIPTOR,
            },
          },
        },
      });
      const status = await refreshOrder(row);
      return json({ orderId: row.id, status });
    }

    const pix = await appmax("/v1/payments/pix", {
      body: { order_id: appmaxOrderId, payment_data: { pix: { document_number: cpf } } },
    });
    const p = pix?.data?.payment ?? {};
    const expiresAt = brasiliaToIso(p.pix_expiration_date);
    await supabaseAdmin.from("appmax_orders")
      .update({ pix_emv: p.pix_emv ?? null, pix_expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return json({
      orderId: row.id,
      status: "pendente",
      pix: { qrcode: p.pix_qrcode ?? null, emv: p.pix_emv ?? null, expiresAt },
    });
  } catch (err) {
    const message = err instanceof AppmaxError ? err.message : (err as Error).message;
    await supabaseAdmin.from("appmax_orders").update({ error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", row.id);
    // Cartão recusado volta como erro de negócio: o aluno pode tentar de novo.
    if (err instanceof AppmaxError) {
      const status = await refreshOrder(row).catch(() => "pendente");
      return json({ orderId: row.id, status, error: message || "Pagamento não aprovado" }, { status: 402 });
    }
    throw err;
  }
}

async function status(userId: string, body: any): Promise<Response> {
  const { data: row } = await supabaseAdmin
    .from("appmax_orders").select("id, user_id, appmax_order_id, status, applied")
    .eq("id", String(body?.orderId ?? "")).maybeSingle();
  if (!row || row.user_id !== userId) return json({ error: "Pedido não encontrado" }, { status: 404 });
  const current = await refreshOrder(row);
  const { data: after } = await supabaseAdmin.from("appmax_orders").select("applied").eq("id", row.id).single();
  return json({ orderId: row.id, status: current, applied: !!after?.applied });
}

// ── Webhook ────────────────────────────────────────────────────────────────

function findOrderId(payload: any): number | null {
  const candidates = [
    payload?.data?.order?.id, payload?.data?.order_id, payload?.order_id,
    payload?.data?.id, payload?.id,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

async function webhook(req: Request): Promise<Response> {
  const payload = await req.json().catch(() => ({}));
  console.log("[appmax] webhook:", payload?.event ?? "(sem evento)", JSON.stringify(payload).slice(0, 300));

  const ids = new Set<string>();
  const orderId = findOrderId(payload);
  if (orderId) {
    const { data } = await supabaseAdmin.from("appmax_orders").select("id").eq("appmax_order_id", orderId).maybeSingle();
    if (data) ids.add(data.id);
  }
  // Rede de segurança: relê os pedidos ainda em aberto dos últimos 3 dias.
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data: open } = await supabaseAdmin
    .from("appmax_orders").select("id")
    .eq("applied", false).gte("created_at", since)
    .not("status", "in", "(cancelado,estornado,recusado_por_risco)")
    .limit(50);
  (open ?? []).forEach((r) => ids.add(r.id));

  for (const id of ids) {
    const { data: row } = await supabaseAdmin.from("appmax_orders").select("id, appmax_order_id, status").eq("id", id).single();
    if (row) await refreshOrder(row).catch((e) => console.error("[appmax] webhook refresh falhou:", id, e?.message));
  }
  return json({ received: true, checked: ids.size });
}

// ── Roteamento ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: "Appmax não configurada" }, { status: 500 });

    const key = new URL(req.url).searchParams.get("key");
    if (key !== null) {
      if (!WEBHOOK_KEY || key !== WEBHOOK_KEY) return json({ error: "Chave inválida" }, { status: 401 });
      return await webhook(req);
    }

    const { user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    switch (body?.action) {
      case "config": return json({ externalId: EXTERNAL_ID, scriptUrl: SCRIPT_URL });
      case "pay":    return await pay(user.id, user.email ?? "", body);
      case "status": return await status(user.id, body);
      default:       return json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[appmax] erro:", err);
    const message = err instanceof AppmaxError ? err.message : (err as Error).message;
    return json({ error: message || "Erro ao processar o pagamento" }, { status: 500 });
  }
});
