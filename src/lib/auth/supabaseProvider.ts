import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { AuthProvider, AuthSession, AuthUser, UserRole } from "./types";
import { AuthError } from "./types";

function mapSupabaseError(error: { message?: string; status?: number; code?: string }): AuthError {
  const msg = error.message || "Falha na autenticação";
  const status = error.status;
  if (status === 400 && msg.toLowerCase().includes("email not confirmed")) {
    return new AuthError(msg, "email_not_confirmed");
  }
  if (status === 422 || msg.toLowerCase().includes("too many requests")) {
    return new AuthError(msg, "too_many_requests");
  }
  if (status === 400) {
    return new AuthError(msg, "invalid_credentials");
  }
  return new AuthError(msg, "unknown");
}

// AuthSession é uma união (supabase | firebase | null); indexá-la por
// ["session"]["user"] não resolvia e o parâmetro caía em erro de tipo.
// O que esta função recebe é sempre o usuário do Supabase.
async function buildUser(u: SupabaseUser): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, avatar_url")
    .eq("id", u.id)
    .single();

  let role = (profile?.role ?? u.user_metadata?.role ?? "user") as UserRole;

  // Instrutor é um usuário real do Supabase Auth vinculado à tabela
  // `instructors` pela coluna user_id (migration 015). Se o perfil ainda não
  // marcou o papel, verificamos o vínculo. O try/catch degrada graciosamente
  // caso a migration 015 (coluna user_id) ainda não tenha sido aplicada.
  if (role === "user") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instQuery: any = supabase.from("instructors");
      const { data: inst } = await instQuery
        .select("id")
        .eq("user_id", u.id)
        .maybeSingle();
      if (inst?.id) role = "instructor";
    } catch { /* coluna user_id ausente — ignora */ }
  }

  return {
    id: u.id,
    email: u.email ?? "",
    name: profile?.name ?? u.user_metadata?.name ?? "",
    role,
    avatarUrl: profile?.avatar_url ?? u.user_metadata?.avatar_url ?? null,
  };
}

async function ensureProfile(userId: string, email: string, name: string) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("profiles").insert({
      id: userId,
      email,
      name,
      role: "user",
    });
  }
}

export const supabaseAuthProvider: AuthProvider = {
  name: "supabase",

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw mapSupabaseError(error);
    const s = data.session;
    if (!s?.user) return { user: null, session: null };
    const user = await buildUser(s.user);
    return { user, session: { provider: "supabase", session: s } };
  },

  async signInWithEmailPassword(email: string, password: string) {
    // Instrutores também são usuários reais do Supabase Auth (migration 015):
    // o papel "instructor" é resolvido em buildUser via instructors.user_id.
    // A comparação antiga de `login_password` em plaintext com a anon key foi
    // removida — a coluna deixou de existir e a senha nunca trafega na query.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw mapSupabaseError(error);

    if (data.user) {
      const user = await buildUser(data.user);
      return { user, session: { provider: "supabase", session: data.session } };
    }
    return { user: null, session: null };
  },

  async signInWithGoogle() {
    // Google é tratado pelo Firebase provider; Supabase puro não implementa aqui.
    throw new AuthError("Use o provider Firebase para login com Google.", "provider_error");
  },

  async signOut() {
    await supabase.auth.signOut({ scope: "local" });
  },

  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!s?.user) {
        callback({ user: null, session: null, event });
        return;
      }
      // Evita deadlock do lock interno do Supabase: agenda fora do callback.
      setTimeout(async () => {
        const user = await buildUser(s.user);
        callback({ user, session: { provider: "supabase", session: s }, event });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  },
};

export { buildUser, ensureProfile };
