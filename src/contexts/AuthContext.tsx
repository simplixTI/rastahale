import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authProvider, isMockModeEnabled } from "@/lib/auth";
import type { AuthSession, AuthUser, UserRole, AuthError } from "@/lib/auth";

interface AuthCtx {
  user: AuthUser | null;
  session: AuthSession;
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

let onSessionExpired: (() => void) | null = null;
export const registerSessionExpiredCallback = (cb: () => void) => {
  onSessionExpired = cb;
};

const AUTH_KEY = "rasta_auth_user";

function persistUser(authUser: AuthUser) {
  try {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  } catch { /* ignore */ }
}

function clearPersistedUser() {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch { /* ignore */ }
}

function restoreLocalUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed.id && parsed.email && parsed.name && parsed.role) return parsed;
  } catch { /* ignore */ }
  return null;
}

// Timeout defensivo para não prender a UI se o provider travar.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let settled = false;

    const releaseLoading = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(releaseLoading, 8000);

    withTimeout(authProvider.getSession(), 10000)
      .then(({ user: restoredUser, session: restoredSession }) => {
        if (!active) return;
        // Se o provider não retornou usuário (ex: instrutor sem sessão Supabase),
        // tenta restaurar do sessionStorage como fallback local.
        const localUser = restoredUser ? null : restoreLocalUser();
        setUser(restoredUser ?? localUser);
        setSession(restoredSession);
        if (!restoredUser && !localUser) clearPersistedUser();
        releaseLoading();
      })
      .catch(() => {
        if (!active) return;
        const localUser = restoreLocalUser();
        setUser(localUser);
        setSession(null);
        releaseLoading();
      });

    const unsubscribe = authProvider.onAuthStateChange(({ user: changedUser, session: changedSession, event }) => {
      if (!active) return;
      setUser(changedUser);
      setSession(changedSession);
      releaseLoading();
      if ((event === "SIGNED_OUT" || event === "USER_DELETED") && !changedUser) {
        onSessionExpired?.();
      }
    });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserRole | null> => {
    try {
      const { user: loggedUser, session: loggedSession } = await withTimeout(
        authProvider.signInWithEmailPassword(email, password),
        10000
      );
      if (loggedUser) {
        setUser(loggedUser);
        setSession(loggedSession);
        // Instrutores não geram sessão Supabase; persistimos localmente.
        if (!loggedSession) persistUser(loggedUser);
        return loggedUser.role;
      }
      return null;
    } catch (err) {
      // Em modo mock, credenciais erradas retornam null sem throw.
      // Em modo Supabase, erros específicos são propagados.
      if (isMockModeEnabled) return null;
      throw err;
    }
  };

  const logout = async () => {
    setUser(null);
    setSession(null);
    clearPersistedUser();
    try {
      await withTimeout(authProvider.signOut(), 4000);
    } catch {
      // Limpou o estado local; provider pode falhar por rede.
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export type { AuthUser, AuthSession, UserRole, AuthError };
