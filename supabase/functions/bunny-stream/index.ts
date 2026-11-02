// ============================================================
//  bunny-stream — ponte entre o app e o Bunny Stream.
//
//  A API key da biblioteca do Bunny dá controle total sobre os vídeos, então
//  ela fica só aqui no servidor. O navegador pede uma assinatura de upload
//  e envia o arquivo direto ao Bunny (TUS), sem passar por esta função.
//
//  Ações (POST JSON):
//    { action: "create-upload", title }  → cria o vídeo e devolve a assinatura TUS
//    { action: "delete", videoId }       → remove um vídeo que nenhuma aula usa mais
//
//  Secrets (supabase secrets set …):
//    BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY
//
//  Deploy:  npx supabase functions deploy bunny-stream --no-verify-jwt
//  (a sessão é validada aqui dentro, em isStaff — a verificação automática do
//  gateway não é compatível com as chaves novas sb_publishable do projeto)
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const LIBRARY_ID = Deno.env.get("BUNNY_STREAM_LIBRARY_ID") ?? "";
const API_KEY    = Deno.env.get("BUNNY_STREAM_API_KEY") ?? "";
const API_BASE   = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`;

// O Bunny recomenda no mínimo 1 h; vídeos longos em conexão lenta passam disso.
const UPLOAD_TTL_SECONDS = 24 * 60 * 60;

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Só admin/instrutor com sessão do Supabase — mesma regra do bucket "media". */
async function isStaff(req: Request): Promise<boolean> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return ["admin", "instructor"].includes(String(profile?.role));
}

async function createUpload(title: string): Promise<Response> {
  const res = await fetch(API_BASE, {
    method:  "POST",
    headers: { AccessKey: API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body:    JSON.stringify({ title: title || "Aula" }),
  });
  if (!res.ok) return json({ error: `Bunny recusou a criação do vídeo (${res.status})` }, 502);
  const { guid } = await res.json();

  const expire    = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
  const signature = await sha256Hex(`${LIBRARY_ID}${API_KEY}${expire}${guid}`);
  return json({ libraryId: LIBRARY_ID, videoId: guid, expire, signature });
}

async function deleteVideo(videoId: string): Promise<Response> {
  if (!GUID.test(videoId)) return json({ error: "videoId inválido" }, 400);

  // Nunca apaga um vídeo que alguma aula ainda usa — protege contra um
  // instrutor removendo o vídeo de outro só por conhecer o GUID (que aparece
  // na URL de reprodução de qualquer aula visível).
  const { count, error } = await admin
    .from("videos")
    .select("id", { count: "exact", head: true })
    .ilike("video_url", `%/${videoId}/%`);
  if (error) return json({ error: error.message }, 500);
  if (count) return json({ error: "Vídeo ainda está em uso por uma aula" }, 409);

  const res = await fetch(`${API_BASE}/${videoId}`, { method: "DELETE", headers: { AccessKey: API_KEY } });
  if (!res.ok && res.status !== 404) return json({ error: `Bunny recusou a exclusão (${res.status})` }, 502);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "Método não permitido" }, 405);
  if (!LIBRARY_ID || !API_KEY)  return json({ error: "Bunny Stream não configurado no servidor" }, 500);
  if (!(await isStaff(req)))    return json({ error: "Sem permissão" }, 401);

  let body: { action?: string; title?: string; videoId?: string };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  switch (body.action) {
    case "create-upload": return createUpload(String(body.title ?? "").slice(0, 200));
    case "delete":        return deleteVideo(String(body.videoId ?? ""));
    default:              return json({ error: "Ação desconhecida" }, 400);
  }
});
