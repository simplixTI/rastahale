import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { TEST_USER, TEST_ADMIN, instructors as mockInstructors } from "@/data/mockData";

export type UserRole = "user" | "admin" | "instructor";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthCtx {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserRole | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  login: async () => null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const MOCK_CREDS: Record<string, { password: string; id: string; name: string; role: UserRole }> = {
  [TEST_USER.email]:  { password: TEST_USER.password,  id: "u1",      name: TEST_USER.name,  role: "user"  },
  [TEST_ADMIN.email]: { password: TEST_ADMIN.password, id: "u-admin", name: TEST_ADMIN.name, role: "admin" },
};

const AUTH_KEY = "rasta_auth_user";

// Evita que uma chamada de rede travada (Supabase lento/instável) prenda a UI
// para sempre — usado no login e na restauração de sessão.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

let onSessionExpired: (() => void) | null = null;
export const registerSessionExpiredCallback = (cb: () => void) => {
  onSessionExpired = cb;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Persiste o usuário logado (mock OU real) em sessionStorage. O ID salvo é o
  // que os hooks usam em isMockMode(): UUID real => Supabase, id curto => mock.
  const persist = (authUser: AuthUser) => {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  useEffect(() => {
    // Restaura sessão salva na aba (vale para modo demo e para usuário real).
    try {
      const saved = sessionStorage.getItem(AUTH_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch { /* ignorar */ }

    // Sem Supabase configurado: modo demo (mock). Não assina eventos de auth.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    let settled = false;
    // Falha de segurança: se o Supabase não responder (rede lenta, incidente
    // na plataforma etc.), libera a UI em vez de travar o app para sempre.
    const releaseLoading = () => {
      if (!settled) { settled = true; setLoading(false); }
    };
    const timeoutId = setTimeout(releaseLoading, 8000);

    const buildUser = async (u: NonNullable<Session["user"]>): Promise<AuthUser> => {
      const { data: profile } = await supabase
        .from("profiles").select("name, role").eq("id", u.id).single();
      return {
        id:    u.id,
        email: u.email ?? "",
        name:  profile?.name ?? u.user_metadata?.name ?? "",
        role:  profile?.role ?? u.user_metadata?.role ?? "user",
      };
    };

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      if (s?.user) persist(await buildUser(s.user));
      releaseLoading();
    }).catch(() => releaseLoading());

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        persist(await buildUser(s.user));
      } else {
        setUser(null);
        sessionStorage.removeItem(AUTH_KEY);
        if (event === "SIGNED_OUT") onSessionExpired?.();
      }
      releaseLoading();
    });

    return () => { active = false; clearTimeout(timeoutId); subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string): Promise<UserRole | null> => {
    const key = email.toLowerCase().trim();

    // Modo demo (sem Supabase): credenciais mock locais (admin / aluno / instrutor).
    if (!isSupabaseConfigured) {
      const mock = MOCK_CREDS[key];
      if (mock && mock.password === password) {
        persist({ id: mock.id, email, name: mock.name, role: mock.role });
        return mock.role;
      }
      const inst = mockInstructors.find(
        (i) => i.loginEmail?.toLowerCase().trim() === key && i.loginPassword === password
      );
      if (inst) {
        persist({ id: inst.id, email: inst.loginEmail!, name: inst.name, role: "instructor" });
        return "instructor";
      }
      return null;
    }

    // Supabase configurado: autenticação real (papel vem de profiles.role).
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }), 10000
      );
      if (error || !data.user) return null;
      const { data: profile } = await withTimeout(
        supabase.from("profiles").select("name, role").eq("id", data.user.id).single(),
        10000
      );
      const role: UserRole = profile?.role ?? data.user.user_metadata?.role ?? "user";
      persist({
        id:    data.user.id,
        email: data.user.email ?? "",
        name:  profile?.name ?? data.user.user_metadata?.name ?? "",
        role,
      });
      return role;
    } catch {
      // Timeout ou falha de rede — não é credencial errada, quem chama deve
      // distinguir isso de "email ou senha incorretos" (ver Login.tsx).
      throw new Error("connection");
    }
  };

  const logout = async () => {
    sessionStorage.removeItem(AUTH_KEY);
    setUser(null);
    setSession(null);
    try { await supabase.auth.signOut(); } catch { /* ignorar erro de rede */ }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
