import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
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

let onSessionExpired: (() => void) | null = null;
export const registerSessionExpiredCallback = (cb: () => void) => {
  onSessionExpired = cb;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
        setLoading(false);
        return;
      }
    } catch { /* ignorar */ }

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const { data: profile } = await supabase
          .from("profiles").select("name, role").eq("id", s.user.id).single();
        setUser({
          id:    s.user.id,
          email: s.user.email ?? "",
          name:  profile?.name ?? s.user.user_metadata?.name ?? "",
          role:  profile?.role ?? s.user.user_metadata?.role ?? "user",
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (sessionStorage.getItem(AUTH_KEY)) return;
      setSession(s);
      if (s?.user) {
        const { data: profile } = await supabase
          .from("profiles").select("name, role").eq("id", s.user.id).single();
        setUser({
          id:    s.user.id,
          email: s.user.email ?? "",
          name:  profile?.name ?? s.user.user_metadata?.name ?? "",
          role:  profile?.role ?? s.user.user_metadata?.role ?? "user",
        });
      } else {
        setUser(null);
        if (event === "SIGNED_OUT") onSessionExpired?.();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<UserRole | null> => {
    const key = email.toLowerCase().trim();

    // 1. Credenciais fixas (admin / aluno demo)
    const mock = MOCK_CREDS[key];
    if (mock && mock.password === password) {
      const authUser: AuthUser = { id: mock.id, email, name: mock.name, role: mock.role };
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
      setUser(authUser);
      return mock.role;
    }

    // 2. Credenciais de instrutor (gerenciadas pelo admin)
    const inst = mockInstructors.find(
      (i) => i.loginEmail?.toLowerCase().trim() === key && i.loginPassword === password
    );
    if (inst) {
      const authUser: AuthUser = { id: inst.id, email: inst.loginEmail!, name: inst.name, role: "instructor" };
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
      setUser(authUser);
      return "instructor";
    }

    // 3. Fallback Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return null;
      const { data: profile } = await supabase
        .from("profiles").select("name, role").eq("id", data.user.id).single();
      const role: UserRole = profile?.role ?? data.user.user_metadata?.role ?? "user";
      setUser({
        id:    data.user.id,
        email: data.user.email ?? "",
        name:  profile?.name ?? data.user.user_metadata?.name ?? "",
        role,
      });
      return role;
    } catch {
      return null;
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
