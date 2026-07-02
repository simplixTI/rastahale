/**
 * RastaHale Academy — Seed de usuários e dados
 * Executar APÓS aplicar o SQL no Supabase Dashboard:
 *   node scripts/seed-users.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "admin@rastahale.com",  password: "admin123",  name: "Admin RastaHale", role: "admin",  plan: "Anual Premium", status: "ativo" },
  { email: "aluno@rastahale.com",  password: "rasta123",  name: "Lucas Atleta",    role: "user",   plan: "Premium",       status: "ativo" },
  { email: "ana@teste.com",        password: "rasta123",  name: "Ana Silva",       role: "user",   plan: "Básico",        status: "ativo" },
  { email: "pedro@teste.com",      password: "rasta123",  name: "Pedro Costa",     role: "user",   plan: "Premium",       status: "ativo" },
  { email: "mariana@teste.com",    password: "rasta123",  name: "Mariana Souza",   role: "user",   plan: "Básico",        status: "pendente" },
  { email: "carlos@teste.com",     password: "rasta123",  name: "Carlos Ferreira", role: "user",   plan: "Premium",       status: "inativo" },
  { email: "juliana@teste.com",    password: "rasta123",  name: "Juliana Rocha",   role: "user",   plan: "Anual Premium", status: "ativo" },
  // Instrutor real (área /studio). TROQUE a senha por uma forte antes de usar em produção.
  { email: "professor@rastahale.com", password: "prof123", name: "Professor RastaHale", role: "instructor", plan: "Anual Premium", status: "ativo", isInstructor: true, bio: "Instrutor de Jiu-Jitsu e Luta Livre." },
];

async function upsertUsers() {
  console.log("⏳  Criando usuários de teste...\n");
  const ids = {};

  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingMap = Object.fromEntries((existing?.users ?? []).map((u) => [u.email, u.id]));

  for (const u of USERS) {
    let userId = existingMap[u.email];

    if (userId) {
      console.log(`   ↩  ${u.email} já existe (${userId})`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, role: u.role },
      });
      if (error) { console.error(`   ❌  ${u.email}: ${error.message}`); continue; }
      userId = data.user.id;
      console.log(`   ✅  ${u.email} criado (${userId})`);
    }

    ids[u.email] = userId;

    await supabase.from("profiles").upsert({
      id: userId, email: u.email, name: u.name, role: u.role,
      plan_name: u.plan, status: u.status, avatar_url: "",
      join_date: new Date().toISOString().split("T")[0],
      last_access: new Date().toISOString(),
      videos_watched: 0, total_hours: 0,
    });

    // Instrutor: cria também a linha em `instructors` com id = UUID do auth user,
    // para que os vídeos enviados no /studio (instructor_id = user.id) satisfaçam o FK.
    if (u.isInstructor) {
      const { error: instErr } = await supabase.from("instructors").upsert({
        id: userId, name: u.name, avatar_url: "", bio: u.bio ?? "",
      });
      if (instErr) console.error(`   ⚠  instructors ${u.email}: ${instErr.message}`);
      else console.log(`   🥋  instructors row criada para ${u.email}`);
    }
  }
  return ids;
}

async function seedProgress(ids) {
  const lucasId = ids["aluno@rastahale.com"];
  const pedroId = ids["pedro@teste.com"];
  const julId   = ids["juliana@teste.com"];
  if (!lucasId) return;

  console.log("\n⏳  Seedando progresso...");

  const rows = [
    { user_id: lucasId, video_id: "v1",  progress: 100, watched: true,  is_favorite: false },
    { user_id: lucasId, video_id: "v2",  progress: 65,  watched: false, is_favorite: true  },
    { user_id: lucasId, video_id: "v4",  progress: 30,  watched: false, is_favorite: false },
    { user_id: lucasId, video_id: "v8",  progress: 80,  watched: false, is_favorite: true  },
    { user_id: lucasId, video_id: "v11", progress: 50,  watched: false, is_favorite: false },
    { user_id: lucasId, video_id: "v13", progress: 40,  watched: false, is_favorite: false },
    ...(pedroId ? [
      { user_id: pedroId, video_id: "v1",  progress: 100, watched: true,  is_favorite: false },
      { user_id: pedroId, video_id: "v2",  progress: 100, watched: true,  is_favorite: true  },
      { user_id: pedroId, video_id: "v3",  progress: 100, watched: true,  is_favorite: false },
      { user_id: pedroId, video_id: "v4",  progress: 100, watched: true,  is_favorite: false },
    ] : []),
    ...(julId ? [
      { user_id: julId, video_id: "v1",  progress: 100, watched: true,  is_favorite: true },
      { user_id: julId, video_id: "v2",  progress: 100, watched: true,  is_favorite: false },
      { user_id: julId, video_id: "v3",  progress: 100, watched: true,  is_favorite: false },
      { user_id: julId, video_id: "v8",  progress: 100, watched: true,  is_favorite: true  },
      { user_id: julId, video_id: "v9",  progress: 75,  watched: false, is_favorite: false },
    ] : []),
  ];

  for (const r of rows) {
    const { error } = await supabase.from("user_progress").upsert({ ...r, last_watched_at: new Date().toISOString() });
    if (error) console.error(`   ⚠  ${r.video_id}: ${error.message}`);
  }
  console.log("✅  Progresso seedado");
}

async function seedPayments(ids) {
  console.log("\n⏳  Seedando pagamentos...");

  const rows = [
    { email: "aluno@rastahale.com",  amount: 79.90,  method: "PIX",    status: "pago",     date: "2025-04-01", plan: "Premium"       },
    { email: "ana@teste.com",        amount: 39.90,  method: "Cartão", status: "pago",     date: "2025-04-01", plan: "Básico"        },
    { email: "pedro@teste.com",      amount: 79.90,  method: "Cartão", status: "pago",     date: "2025-03-28", plan: "Premium"       },
    { email: "mariana@teste.com",    amount: 39.90,  method: "Boleto", status: "pendente", date: "2025-03-25", plan: "Básico"        },
    { email: "carlos@teste.com",     amount: 79.90,  method: "PIX",    status: "falhou",   date: "2025-01-10", plan: "Premium"       },
    { email: "aluno@rastahale.com",  amount: 79.90,  method: "PIX",    status: "pago",     date: "2025-03-01", plan: "Premium"       },
    { email: "pedro@teste.com",      amount: 79.90,  method: "Cartão", status: "pago",     date: "2025-02-28", plan: "Premium"       },
    { email: "juliana@teste.com",    amount: 699.90, method: "PIX",    status: "pago",     date: "2024-06-01", plan: "Anual Premium" },
  ];

  const { data: profiles } = await supabase.from("profiles").select("id, email, name");
  const pm = Object.fromEntries((profiles ?? []).map((p) => [p.email, p]));

  for (const r of rows) {
    const prof = pm[r.email];
    if (!prof) continue;
    const { error } = await supabase.from("payments").insert({
      user_id: prof.id, user_name: prof.name,
      amount: r.amount, method: r.method, status: r.status, date: r.date, plan_name: r.plan,
    });
    if (error && !error.message.includes("duplicate")) console.error(`   ⚠  ${r.email}: ${error.message}`);
  }
  console.log("✅  Pagamentos seedados");
}

async function main() {
  console.log("🚀  RastaHale Academy — Seed de dados\n");
  const ids = await upsertUsers();
  await seedProgress(ids);
  await seedPayments(ids);
  console.log("\n🎉  Seed concluído!\n");
  console.log("Credenciais:");
  console.log("  Aluno:      aluno@rastahale.com      / rasta123");
  console.log("  Admin:      admin@rastahale.com      / admin123");
  console.log("  Professor:  professor@rastahale.com  / prof123\n");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
