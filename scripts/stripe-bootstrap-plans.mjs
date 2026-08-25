// scripts/stripe-bootstrap-plans.mjs
//
// Cria os 3 planos padrão do RastaHale no Stripe (product + price recorrente)
// e imprime, no final, o SQL para você colar no SQL Editor do Supabase
// e vincular os price_id às linhas da tabela `plans`.
//
// Uso:
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-bootstrap-plans.mjs
//
// Idempotente: procura por produto com metadata.plan_id antes de criar.
// Se rodar duas vezes, não duplica.

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error("Faltando STRIPE_SECRET_KEY. Ex: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-bootstrap-plans.mjs");
  process.exit(1);
}
if (!STRIPE_KEY.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY inválida (deve começar com sk_test_ ou sk_live_).");
  process.exit(1);
}
const isLive = STRIPE_KEY.startsWith("sk_live_");
if (isLive) {
  console.warn("⚠️  ATENÇÃO: usando chave LIVE. Produtos criados afetam a conta real.");
}

// ---------- Planos padrão ----------
// price em reais (multiplico por 100 abaixo pra centavos).
const PLANS = [
  {
    plan_id: "plan-1",
    name: "Básico",
    price: 39.90,
    interval: { interval: "month", interval_count: 1 },
    description: "Acesso a aulas de Fundamentos · 1 categoria · Suporte por email",
  },
  {
    plan_id: "plan-2",
    name: "Premium",
    price: 79.90,
    interval: { interval: "month", interval_count: 1 },
    description: "Acesso total · Todas as categorias · Aulas avançadas · Suporte prioritário",
  },
  {
    plan_id: "plan-3",
    name: "Anual Premium",
    price: 699.90,
    interval: { interval: "year", interval_count: 1 },
    description: "Tudo do Premium · 2 meses grátis · Acesso antecipado · Mentoria mensal",
  },
];

// ---------- Wrapper mínimo pra API Stripe ----------
async function stripe(method, path, params = {}) {
  const body = new URLSearchParams();
  const flatten = (prefix, obj) => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) flatten(key, v);
      else if (v !== undefined && v !== null) body.append(key, String(v));
    }
  };
  flatten("", params);

  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${method} ${path}: ${data.error?.message || res.status}`);
  }
  return data;
}

// ---------- Fluxo principal ----------
async function findExistingProduct(planId) {
  // A API não permite filtrar por metadata direto — listamos os 100 mais recentes.
  const list = await stripe("GET", `/v1/products?limit=100&active=true`);
  return list.data.find((p) => p.metadata?.plan_id === planId) ?? null;
}

async function ensureProduct(plan) {
  const existing = await findExistingProduct(plan.plan_id);
  if (existing) {
    console.log(`  → produto já existe: ${existing.id}`);
    return existing;
  }
  const created = await stripe("POST", "/v1/products", {
    name: plan.name,
    description: plan.description,
    metadata: { plan_id: plan.plan_id },
  });
  console.log(`  → produto criado: ${created.id}`);
  return created;
}

async function findActivePriceForProduct(productId, expected) {
  const list = await stripe("GET", `/v1/prices?product=${productId}&active=true&limit=100`);
  return list.data.find(
    (p) =>
      p.currency === "brl" &&
      p.unit_amount === expected.unit_amount &&
      p.recurring?.interval === expected.recurring.interval &&
      p.recurring?.interval_count === expected.recurring.interval_count,
  ) ?? null;
}

async function ensurePrice(productId, plan) {
  const expected = {
    unit_amount: Math.round(plan.price * 100),
    currency: "brl",
    recurring: plan.interval,
  };
  const existing = await findActivePriceForProduct(productId, expected);
  if (existing) {
    console.log(`  → preço já existe: ${existing.id} (R$ ${(existing.unit_amount / 100).toFixed(2)})`);
    return existing;
  }
  const created = await stripe("POST", "/v1/prices", {
    product: productId,
    unit_amount: expected.unit_amount,
    currency: expected.currency,
    recurring: expected.recurring,
    metadata: { plan_id: plan.plan_id },
  });
  console.log(`  → preço criado: ${created.id}`);
  return created;
}

async function main() {
  console.log(`Modo Stripe: ${isLive ? "LIVE" : "TEST"}\n`);

  const rows = [];
  for (const plan of PLANS) {
    console.log(`━ ${plan.name} (${plan.plan_id})`);
    const product = await ensureProduct(plan);
    const price = await ensurePrice(product.id, plan);
    rows.push({ plan_id: plan.plan_id, name: plan.name, product: product.id, price: price.id });
    console.log("");
  }

  console.log("═════════════════════════════════════════════════════");
  console.log("Resumo:");
  console.table(rows);

  console.log("\n📋 SQL pra rodar no SQL Editor do Supabase:\n");
  for (const r of rows) {
    console.log(
      `UPDATE public.plans SET stripe_product_id = '${r.product}', stripe_price_id = '${r.price}' WHERE id = '${r.plan_id}';`,
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Erro:", err.message);
  process.exit(1);
});
