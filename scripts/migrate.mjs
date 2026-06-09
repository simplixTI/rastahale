/**
 * RastaHale Academy — Migration & Seed script
 * Executa via: node scripts/migrate.mjs
 * Requer: SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL no .env
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente no .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Aplicar SQL de migração via pgmeta ────────────────────────
async function runSQL(sql, label) {
  console.log(`\n⏳  ${label}...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql }),
  });

  // Se exec_sql não existir, usar o endpoint alternativo do pgmeta
  if (res.status === 404) {
    return runSQLViaPgmeta(sql, label);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SQL falhou (${res.status}): ${body}`);
  }
  console.log(`✅  ${label} OK`);
}

async function runSQLViaPgmeta(sql, label) {
  // Tenta o endpoint pgmeta do Supabase (disponível em projetos self-hosted e cloud)
  const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`pgmeta SQL falhou (${res.status}): ${body.slice(0, 300)}`);
  }
  console.log(`✅  ${label} OK`);
}

// ── Criar usuários de teste ───────────────────────────────────
async function createTestUsers() {
  console.log("\n⏳  Criando usuários de teste...");

  const users = [
    { email: "admin@rastahale.com",  password: "admin123",  name: "Admin RastaHale", role: "admin",  plan: "Anual Premium", status: "ativo" },
    { email: "aluno@rastahale.com",  password: "rasta123",  name: "Lucas Atleta",   role: "user",   plan: "Premium",      status: "ativo" },
    { email: "ana@teste.com",        password: "rasta123",  name: "Ana Silva",      role: "user",   plan: "Básico",       status: "ativo" },
    { email: "pedro@teste.com",      password: "rasta123",  name: "Pedro Costa",    role: "user",   plan: "Premium",      status: "ativo" },
    { email: "mariana@teste.com",    password: "rasta123",  name: "Mariana Souza",  role: "user",   plan: "Básico",       status: "pendente" },
    { email: "carlos@teste.com",     password: "rasta123",  name: "Carlos Ferreira",role: "user",   plan: "Premium",      status: "inativo" },
    { email: "juliana@teste.com",    password: "rasta123",  name: "Juliana Rocha",  role: "user",   plan: "Anual Premium",status: "ativo" },
  ];

  const createdIds = {};

  for (const u of users) {
    // Verificar se já existe
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((x) => x.email === u.email);

    let userId;
    if (found) {
      console.log(`   ↩  ${u.email} já existe (${found.id})`);
      userId = found.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, role: u.role },
      });
      if (error) {
        console.error(`   ❌  ${u.email}: ${error.message}`);
        continue;
      }
      userId = data.user.id;
      console.log(`   ✅  ${u.email} criado (${userId})`);
    }

    createdIds[u.email] = userId;

    // Atualizar perfil
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: u.email,
        name: u.name,
        role: u.role,
        plan_name: u.plan,
        status: u.status,
        avatar_url: "",
        join_date: new Date().toISOString().split("T")[0],
        last_access: new Date().toISOString(),
        videos_watched: 0,
        total_hours: 0,
      });

    if (profileErr) console.error(`   ⚠  perfil ${u.email}: ${profileErr.message}`);
  }

  return createdIds;
}

// ── Seed: progresso do aluno principal ───────────────────────
async function seedProgress(userIds) {
  const lucasId = userIds["aluno@rastahale.com"];
  if (!lucasId) return;

  console.log("\n⏳  Seedando progresso do Lucas...");

  const progress = [
    { video_id: "v1",  progress: 100, watched: true,  is_favorite: false },
    { video_id: "v2",  progress: 65,  watched: false, is_favorite: true  },
    { video_id: "v4",  progress: 30,  watched: false, is_favorite: false },
    { video_id: "v8",  progress: 80,  watched: false, is_favorite: true  },
    { video_id: "v11", progress: 50,  watched: false, is_favorite: false },
    { video_id: "v13", progress: 40,  watched: false, is_favorite: false },
  ];

  for (const p of progress) {
    const { error } = await supabase.from("user_progress").upsert({
      user_id: lucasId,
      ...p,
      last_watched_at: new Date().toISOString(),
    });
    if (error) console.error(`   ⚠  progresso ${p.video_id}: ${error.message}`);
  }
  console.log("✅  Progresso seedado");
}

// ── Seed: pagamentos ─────────────────────────────────────────
async function seedPayments(userIds) {
  console.log("\n⏳  Seedando pagamentos...");

  const payments = [
    { email: "aluno@rastahale.com",  amount: 79.90,  method: "PIX",    status: "pago",     date: "2025-04-01", plan: "Premium" },
    { email: "ana@teste.com",        amount: 39.90,  method: "Cartão", status: "pago",     date: "2025-04-01", plan: "Básico" },
    { email: "pedro@teste.com",      amount: 79.90,  method: "Cartão", status: "pago",     date: "2025-03-28", plan: "Premium" },
    { email: "mariana@teste.com",    amount: 39.90,  method: "Boleto", status: "pendente", date: "2025-03-25", plan: "Básico" },
    { email: "carlos@teste.com",     amount: 79.90,  method: "PIX",    status: "falhou",   date: "2025-01-10", plan: "Premium" },
    { email: "aluno@rastahale.com",  amount: 79.90,  method: "PIX",    status: "pago",     date: "2025-03-01", plan: "Premium" },
    { email: "pedro@teste.com",      amount: 79.90,  method: "Cartão", status: "pago",     date: "2025-02-28", plan: "Premium" },
    { email: "juliana@teste.com",    amount: 699.90, method: "PIX",    status: "pago",     date: "2024-06-01", plan: "Anual Premium" },
  ];

  // Buscar nomes dos usuários
  const { data: profiles } = await supabase.from("profiles").select("id, email, name");
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.email, p]));

  for (const p of payments) {
    const profile = profileMap[p.email];
    if (!profile) { console.warn(`   ⚠  perfil não encontrado: ${p.email}`); continue; }

    const { error } = await supabase.from("payments").insert({
      user_id:   profile.id,
      user_name: profile.name,
      amount:    p.amount,
      method:    p.method,
      status:    p.status,
      date:      p.date,
      plan_name: p.plan,
    });
    if (error && !error.message.includes("duplicate")) {
      console.error(`   ⚠  pagamento ${p.email}: ${error.message}`);
    }
  }
  console.log("✅  Pagamentos seedados");
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("🚀  RastaHale Academy — Migração Supabase\n");
  console.log(`📡  Projeto: ${SUPABASE_URL}`);

  try {
    // 1. Schema
    const schema = readFileSync(join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    await runSQL(schema, "Schema (tabelas + RLS + funções)");

    // 2. Seed estático (instructors, plans, videos)
    const seed = readFileSync(join(__dirname, "../supabase/migrations/002_seed_data.sql"), "utf8");
    // Filtra os comentários de "usuários" (não são SQL executável)
    const seedSQL = seed.split("\n").filter(l => !l.startsWith("-- ATENÇÃO") && !l.startsWith("-- Ver scripts")).join("\n");
    await runSQL(seedSQL, "Seed estático (instructors, plans, videos)");

    // 3. Usuários de teste
    const userIds = await createTestUsers();

    // 4. Progresso
    await seedProgress(userIds);

    // 5. Pagamentos
    await seedPayments(userIds);

    console.log("\n🎉  Migração concluída com sucesso!\n");
    console.log("Credenciais de teste:");
    console.log("  Aluno:  aluno@rastahale.com  / rasta123");
    console.log("  Admin:  admin@rastahale.com  / admin123\n");

  } catch (err) {
    console.error("\n❌  Erro na migração:", err.message);
    process.exit(1);
  }
}

main();
