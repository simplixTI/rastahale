// ============================================================
//  delete-account — o próprio usuário apaga a conta.
//
//  Exigência das lojas: app com criação de conta precisa deixar o usuário
//  iniciar a exclusão de dentro do app (Apple 5.1.1(v), Google Play).
//  Como apagar o auth user exige a service role, a exclusão passa por aqui.
//
//  Chamada: POST com o JWT do usuário (supabase.functions.invoke já manda).
//
//  O que acontece:
//   1. payments.user_id não tem ON DELETE CASCADE (registro fiscal) —
//      os pagamentos são desvinculados da conta (user_id = null);
//   2. admin.auth.admin.deleteUser apaga o auth user; profiles,
//      user_progress (progresso + favoritos), push_tokens e
//      instructor_comments caem por cascade, e instructors.user_id
//      vira NULL (migration 015);
//   3. conta de admin não pode se auto-excluir — o app ficaria sem admin.
//
//  Deploy:  npx supabase functions deploy delete-account --no-verify-jwt
//  (a sessão é validada aqui dentro, como na admin-instructors)
// ============================================================

import { supabaseAdmin as admin } from "../_shared/supabase.ts";
import { handleCorsPreflight, json } from "../_shared/cors.ts";

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, { status: 405 });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "Não autenticado");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) throw new HttpError(401, "Sessão inválida");

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role === "admin") {
      throw new HttpError(409, "Conta de administrador não pode ser excluída pelo app");
    }

    const { error: payError } = await admin
      .from("payments").update({ user_id: null }).eq("user_id", user.id);
    if (payError) throw payError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
    console.error("[delete-account]", err);
    return json({ error: "Erro ao excluir a conta. Tente novamente." }, { status: 500 });
  }
});
