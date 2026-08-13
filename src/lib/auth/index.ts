import { supabase } from "@/lib/supabase";
import { mockAuthProvider } from "./mock";
import { supabaseAuthProvider } from "./supabaseProvider";
import { isFirebaseConfigured } from "./firebase";
import { signInWithGoogleFirebase, signOutFirebase } from "./firebaseProvider";
import type { AuthProvider, AuthSession, AuthUser } from "./types";
import { AuthError } from "./types";
import { buildUser, ensureProfile } from "./supabaseProvider";

// Modo demo/mock é opt-in explícito. Nunca ativa automaticamente só porque
// Supabase/Firebase não estão configurados — isso evita expor credenciais
// hardcoded em deploys de produção sem .env.
export const isMockModeEnabled = import.meta.env.VITE_ENABLE_MOCK === "true";

export const isAnyAuthConfigured =
  !!import.meta.env.VITE_SUPABASE_URL ||
  !!import.meta.env.VITE_FIREBASE_API_KEY;

const hybridProvider: AuthProvider = {
  name: "supabase",

  async getSession() {
    return supabaseAuthProvider.getSession();
  },

  async signInWithEmailPassword(email: string, password: string) {
    return supabaseAuthProvider.signInWithEmailPassword(email, password);
  },

  async signInWithGoogle() {
    const { idToken, email, name, photoUrl } = await signInWithGoogleFirebase();

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      // Mapeia erro comum de provider não configurado.
      if (error.message?.toLowerCase().includes("provider")) {
        throw new AuthError(
          "Login com Google não configurado no Supabase. Verifique o provider Google nas configurações do projeto.",
          "provider_error"
        );
      }
      throw new AuthError(error.message || "Falha ao vincular Google ao Supabase.", "provider_error");
    }

    if (!data.user || !data.session) {
      throw new AuthError("Sessão não criada após login Google.", "provider_error");
    }

    await ensureProfile(data.user.id, email, name);
    if (photoUrl) {
      await supabase
        .from("profiles")
        .update({ avatar_url: photoUrl })
        .eq("id", data.user.id)
        .is("avatar_url", null);
    }

    const user = await buildUser(data.user);
    return { user, session: { provider: "supabase", session: data.session } as AuthSession };
  },

  async signOut() {
    await Promise.allSettled([supabaseAuthProvider.signOut(), signOutFirebase()]);
    // Garante limpeza residual de tokens Supabase.
    for (const store of [sessionStorage, localStorage]) {
      try {
        for (const k of Object.keys(store)) {
          if (k.startsWith("sb-") && k.includes("auth-token")) store.removeItem(k);
        }
      } catch { /* ignore */ }
    }
  },

  onAuthStateChange(callback) {
    return supabaseAuthProvider.onAuthStateChange(callback);
  },
};

export const authProvider: AuthProvider = isMockModeEnabled ? mockAuthProvider : hybridProvider;

export { isFirebaseConfigured };
export * from "./types";
