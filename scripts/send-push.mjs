/**
 * RastaHale Academy — Envio de push notifications (server-side)
 *
 * Lê os tokens FCM da tabela `push_tokens` (migration 016) e envia a
 * notificação via Firebase Admin SDK. Tokens inválidos/expirados são
 * removidos da tabela automaticamente.
 *
 * Uso:
 *   node scripts/send-push.mjs "Título" "Mensagem" [--user <uuid>] [--url /video/v1]
 *
 * Requer no .env: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY,
 * e o arquivo firebase-service-account.json na raiz (gitignored — NUNCA commitar).
 */

import admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const [title, body, ...flags] = process.argv.slice(2);
if (!title || !body) {
  console.error('Uso: node scripts/send-push.mjs "Título" "Mensagem" [--user <uuid>] [--url /rota]');
  process.exit(1);
}
const flagValue = (name) => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : undefined;
};
const targetUser = flagValue("--user");
const clickUrl = flagValue("--url") ?? "/";

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../firebase-service-account.json"), "utf8")
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  let query = supabase.from("push_tokens").select("id, token, platform");
  if (targetUser) query = query.eq("user_id", targetUser);

  const { data: rows, error } = await query;
  if (error) {
    console.error("❌  Erro ao ler push_tokens:", error.message);
    console.error("    (a migration 016_push_tokens.sql já foi aplicada?)");
    process.exit(1);
  }
  if (!rows?.length) {
    console.log("⚠  Nenhum token registrado" + (targetUser ? ` para o usuário ${targetUser}` : "") + ".");
    return;
  }

  console.log(`⏳  Enviando para ${rows.length} dispositivo(s)...`);

  const res = await admin.messaging().sendEachForMulticast({
    tokens: rows.map((r) => r.token),
    notification: { title, body },
    webpush: {
      notification: { title, body, icon: "/icon-192.png" },
      fcmOptions: { link: clickUrl },
    },
    data: { url: clickUrl },
  });

  // Remove tokens que o FCM reportou como inválidos (app desinstalado etc.)
  const staleIds = [];
  res.responses.forEach((r, i) => {
    const code = r.error?.code ?? "";
    if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
      staleIds.push(rows[i].id);
    }
  });
  if (staleIds.length) {
    await supabase.from("push_tokens").delete().in("id", staleIds);
    console.log(`   🧹  ${staleIds.length} token(s) inválido(s) removido(s)`);
  }

  console.log(`✅  Entregues: ${res.successCount} | Falhas: ${res.failureCount}`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
