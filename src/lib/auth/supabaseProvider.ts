import { supabase } from "@/lib/supabase";
import type { AuthProvider, AuthSession, AuthUser, UserRole } from "./types";
import { AuthError } from "./types";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

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

async function buildUser(u: NonNullable<AuthSession["session"]["user"]>): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, avatar_url")
    .eq("id", u.id)
    .single();

  return {
    id: u.id,
    email: u.email ?? "",
    name: profile?.name ?? u.user_metadata?.name ?? "",
    role: (profile?.role ?? u.user_metadata?.role ?? "user") as UserRole,
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
    const key = email.toLowerCase().trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user) {
      const user = await buildUser(data.user);
      return { user, session: { provider: "supabase", session: data.session } };
    }

    // Se não é usuário do Supabase Auth, pode ser um instrutor. As credenciais de
    // instrutor ficam na tabela `instructors`. A senha é verificada no servidor.
    // TODO: migrar instrutores para usuários reais do Supabase Auth e remover isto.
    if (error && (error.status === 400 || error.message?.toLowerCase().includes("invalid"))) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instQuery: any = supabase.from("instructors");
      const { data: inst } = await withTimeout(
        instQuery
          .select("id, name, login_email")
          .eq("login_email", key)
          .eq("login_password", password)
          .maybeSingle(),
        10000
      );
      if (inst?.id) {
        const user: AuthUser = {
          id: inst.id,
          email: inst.login_email ?? key,
          name: inst.name,
          role: "instructor",
        };
        return { user, session: null };
      }
    }

    if (error) throw mapSupabaseError(error);
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
