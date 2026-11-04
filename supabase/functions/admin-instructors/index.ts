// ============================================================
//  admin-instructors — cadastro de professores.
//
//  Criar um login exige a service role (auth.admin), que nunca vai para o
//  navegador. Por isso o cadastro passa por aqui.
//
//  Ações (POST JSON):
//    { action: "save", id?, name, bio, avatar, email?, password? }  → só admin
//    { action: "remove", id, lessons?, transferTo? }                → só admin
//    { action: "save-own", name, bio, avatar }                      → o próprio professor
//
//  Remover apaga também o login do professor. Se ele tem aulas, `lessons` diz o
//  que fazer com elas: "delete" (exclui, inclusive do Bunny) ou "transfer"
//  (passa para `transferTo`). Sessões e comentários dele são apagados junto.
//
//  Professor com login tem instructors.id igual ao id do login: o Studio e as
//  policies de videos e studio_sessions comparam instructor_id com auth.uid().
//  Dar acesso a um professor antigo ("inst-…") move as aulas dele para o id novo.
//
//  Deploy:  npx supabase functions deploy admin-instructors --no-verify-jwt
//  (a sessão é validada aqui dentro, como na função bunny-stream)
// ============================================================

import { supabaseAdmin as admin } from "../_shared/supabase.ts";
import { handleCorsPreflight, json } from "../_shared/cors.ts";

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

interface Caller {
  id:   string;
  role: string;
}

interface Body {
  action?:   string;
  id?:       string;
  name?:     string;
  bio?:      string;
  avatar?:   string;
  email?:    string;
  password?: string;
  // action "remove": o que fazer com as aulas do professor.
  lessons?:    "delete" | "transfer";
  transferTo?: string;
}

interface InstructorFields {
  name:       string;
  bio:        string;
  avatar_url: string;
}

const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_STREAM_LIBRARY_ID") ?? "";
const BUNNY_API_KEY    = Deno.env.get("BUNNY_STREAM_API_KEY") ?? "";
const BUNNY_PLAYLIST   = /^https:\/\/[^/]+\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/playlist\.m3u8/i;

const MIN_PASSWORD = 6;
const PAYING_STATUSES = ["active", "trialing"];
// Tabelas que apontam para instructors(id).
const TABLES_WITH_INSTRUCTOR = ["videos", "studio_sessions", "instructor_comments"];

async function getCaller(req: Request): Promise<Caller | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { id: user.id, role: String(profile?.role) };
}

function readFields(body: Body): InstructorFields {
  const name = (body.name ?? "").trim();
  const bio  = (body.bio ?? "").trim();
  if (name.length < 3) throw new HttpError(400, "O nome precisa de pelo menos 3 caracteres");
  if (!bio)            throw new HttpError(400, "Preencha a bio");
  return { name, bio, avatar_url: body.avatar ?? "" };
}

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD) {
    throw new HttpError(400, `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres`);
  }
}

function authMessage(error: { message?: string } | null): string {
  const message = error?.message ?? "";
  if (/already.*registered|already.*exists/i.test(message)) return "Este email já está em uso por outra conta";
  if (/password/i.test(message)) return "Senha recusada: use uma senha mais forte";
  if (/email/i.test(message))    return "Email inválido";
  return message || "Não foi possível salvar o login";
}

async function moveInstructorData(fromId: string, toId: string) {
  for (const table of TABLES_WITH_INSTRUCTOR) {
    const { error } = await admin.from(table).update({ instructor_id: toId }).eq("instructor_id", fromId);
    if (error) throw error;
  }
}

/** Cria o login (ou aproveita a conta de um aluno) e liga ao cadastro do professor. */
async function grantAccess(oldId: string | null, fields: InstructorFields, email: string, password: string) {
  const { data: account, error: accountError } = await admin
    .from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (accountError) throw accountError;
  if (account?.role === "admin") {
    throw new HttpError(409, "Este email é de um administrador e não pode virar professor");
  }

  let userId: string;
  const created = !account;
  if (account) {
    userId = account.id;
    const { data: taken, error } = await admin
      .from("instructors").select("id").or(`id.eq.${userId},user_id.eq.${userId}`).maybeSingle();
    if (error) throw error;
    if (taken) throw new HttpError(409, "Este email já é de outro professor");
  } else {
    checkPassword(password);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: fields.name, role: "instructor" },
    });
    if (error || !data.user) throw new HttpError(400, authMessage(error));
    userId = data.user.id;
  }

  try {
    const { error: insertError } = await admin.from("instructors").insert({ id: userId, user_id: userId, ...fields });
    if (insertError) throw insertError;

    if (oldId) {
      await moveInstructorData(oldId, userId);
      const { error } = await admin.from("instructors").delete().eq("id", oldId);
      if (error) throw error;
    }

    const { error: profileError } = created
      ? await admin.from("profiles").upsert({
          id: userId, email, name: fields.name, avatar_url: fields.avatar_url, role: "instructor", status: "ativo",
        })
      : await admin.from("profiles").update({ role: "instructor" }).eq("id", userId);
    if (profileError) throw profileError;

    return json({ id: userId, existingAccount: !created });
  } catch (err) {
    // Sem transação aqui: desfaz na ordem inversa para não deixar meio cadastro.
    if (oldId) await moveInstructorData(userId, oldId).catch(() => { /* melhor esforço */ });
    await admin.from("instructors").delete().eq("id", userId);
    if (created) await admin.auth.admin.deleteUser(userId).catch(() => { /* melhor esforço */ });
    throw err;
  }
}

/** Professor que já tem login: atualiza os dados e, se informados, email e senha. */
async function updateLinked(id: string, userId: string, fields: InstructorFields, email: string, password: string) {
  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const changes: { email?: string; email_confirm?: boolean; password?: string } = {};
  if (email && email !== profile?.email) {
    changes.email = email;
    changes.email_confirm = true;
  }
  if (password) {
    checkPassword(password);
    changes.password = password;
  }
  if (Object.keys(changes).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(userId, changes);
    if (error) throw new HttpError(400, authMessage(error));
  }

  const { error } = await admin.from("instructors").update(fields).eq("id", id);
  if (error) throw error;
  const { error: profileError } = await admin
    .from("profiles")
    .update({ name: fields.name, ...(changes.email ? { email: changes.email } : {}) })
    .eq("id", userId);
  if (profileError) throw profileError;
  return json({ id });
}

async function save(body: Body): Promise<Response> {
  const fields   = readFields(body);
  const email    = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  let current: { id: string; user_id: string | null } | null = null;
  if (body.id) {
    const { data, error } = await admin.from("instructors").select("id, user_id").eq("id", body.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "Professor não encontrado");
    current = data;
  }

  if (current?.user_id) return updateLinked(current.id, current.user_id, fields, email, password);
  if (email) return grantAccess(current?.id ?? null, fields, email, password);
  if (password) throw new HttpError(400, "Informe o email de acesso");

  // Professor sem acesso ao Studio: só aparece no catálogo.
  if (current) {
    const { error } = await admin.from("instructors").update(fields).eq("id", current.id);
    if (error) throw error;
    return json({ id: current.id });
  }
  const id = `inst-${Date.now()}`;
  const { error } = await admin.from("instructors").insert({ id, ...fields });
  if (error) throw error;
  return json({ id });
}

/** Apaga do Bunny os vídeos das aulas excluídas, se nenhuma outra aula os usa. */
async function deleteBunnyVideos(urls: (string | null)[]) {
  if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY) return;
  for (const url of urls) {
    const guid = url?.match(BUNNY_PLAYLIST)?.[1];
    if (!guid) continue;
    const { count } = await admin
      .from("videos").select("id", { count: "exact", head: true }).ilike("video_url", `%/${guid}/%`);
    if (count) continue;
    // Melhor esforço: a aula já saiu; uma falha aqui só deixa o arquivo no Bunny.
    await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${guid}`, {
      method: "DELETE",
      headers: { AccessKey: BUNNY_API_KEY },
    }).catch(() => { /* órfão no Bunny */ });
  }
}

/**
 * Apaga o login do professor removido; se quiser estudar, ele cria uma conta de
 * aluno como qualquer pessoa. Exceção: conta que já pagou algo não é apagada,
 * porque isso deixaria uma assinatura cobrando sem dono e levaria junto o
 * histórico de pagamentos. Essa volta a ser de aluno. Devolve true nesse caso.
 */
async function removeAccount(userId: string): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles").select("role, subscription_status").eq("id", userId).maybeSingle();
  if (profile?.role === "admin") return false;

  const paying = PAYING_STATUSES.includes(String(profile?.subscription_status));
  const { count, error: paymentsError } = await admin
    .from("payments").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (paymentsError) throw paymentsError;

  // Tira o papel antes: se apagar o login falhar, o acesso ao Studio já acabou.
  const { error: profileError } = await admin
    .from("profiles").update({ role: "user", status: paying ? "ativo" : "inativo" }).eq("id", userId);
  if (profileError) throw profileError;
  if (paying || count) return true;

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new HttpError(500, "O professor foi removido, mas não foi possível apagar o login dele");
  return false;
}

/** Remove o professor. Se ele tem aulas, o admin decide: excluir ou passar a outro. */
async function remove(body: Body): Promise<Response> {
  const id = String(body.id ?? "");
  const { data: instructor, error } = await admin.from("instructors").select("id, user_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!instructor) throw new HttpError(404, "Professor não encontrado");

  const { data: lessons, error: lessonsError } = await admin
    .from("videos").select("id, video_url").eq("instructor_id", id);
  if (lessonsError) throw lessonsError;

  if (lessons?.length) {
    if (body.lessons === "transfer") {
      const target = String(body.transferTo ?? "");
      if (!target || target === id) throw new HttpError(400, "Escolha outro professor para receber as aulas");
      const { data: exists, error: targetError } = await admin
        .from("instructors").select("id").eq("id", target).maybeSingle();
      if (targetError) throw targetError;
      if (!exists) throw new HttpError(404, "O professor escolhido para receber as aulas não existe");
      const { error: moveError } = await admin.from("videos").update({ instructor_id: target }).eq("instructor_id", id);
      if (moveError) throw moveError;
    } else if (body.lessons === "delete") {
      const { error: deleteLessonsError } = await admin.from("videos").delete().eq("instructor_id", id);
      if (deleteLessonsError) throw deleteLessonsError;
      await deleteBunnyVideos(lessons.map((l) => l.video_url));
    } else {
      throw new HttpError(409, `Este professor tem ${lessons.length} aula(s). Escolha se elas serão excluídas ou passadas para outro professor.`);
    }
  }

  const { error: deleteError } = await admin.from("instructors").delete().eq("id", id);
  if (deleteError) throw deleteError;

  const keptAsStudent = instructor.user_id ? await removeAccount(instructor.user_id) : false;
  return json({ ok: true, keptAsStudent });
}

/** O professor edita o próprio perfil. A RLS de instructors só deixa o admin escrever. */
async function saveOwn(caller: Caller, body: Body): Promise<Response> {
  const fields = readFields(body);
  const { data, error } = await admin.from("instructors").update(fields).eq("user_id", caller.id).select("id");
  if (error) throw error;
  if (!data?.length) throw new HttpError(404, "Seu cadastro de professor não foi encontrado");
  const { error: profileError } = await admin
    .from("profiles").update({ name: fields.name, avatar_url: fields.avatar_url }).eq("id", caller.id);
  if (profileError) throw profileError;
  return json({ ok: true });
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, { status: 405 });

  try {
    const caller = await getCaller(req);
    if (!caller) throw new HttpError(401, "Sem permissão");

    const body: Body | null = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "JSON inválido");

    if (body.action === "save-own") return await saveOwn(caller, body);
    if (caller.role !== "admin") throw new HttpError(403, "Só o administrador pode fazer isso");

    switch (body.action) {
      case "save":   return await save(body);
      case "remove": return await remove(body);
      default:       throw new HttpError(400, "Ação desconhecida");
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
    console.error("[admin-instructors]", err);
    return json({ error: "Erro ao salvar. Tente novamente." }, { status: 500 });
  }
});
