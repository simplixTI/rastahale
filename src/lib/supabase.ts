import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Fallback para quando as env vars não estão configuradas (ex: deploy sem .env)
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * true quando URL e anon key reais estão presentes no .env.
 * Usado para decidir entre autenticação real (Supabase) e o modo demo (mock).
 */
export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

// Storage do token de auth. Usa sessionStorage (por-aba) em vez do localStorage
// padrão do Supabase. Motivo: o app trata "fechar a aba = logout" (ver CLAUDE.md
// e AuthContext, que já persiste o usuário em sessionStorage). Com o token no
// localStorage, ele SOBREVIVIA ao fechamento da aba; ao reabrir, a restauração
// da sessão encontrava um token velho/expirado, travava o refresh e IMPEDIA
// novos logins ("não entra em nenhuma conta até limpar o cache do site").
// sessionStorage some junto com a aba, então cada reabertura começa limpa.
const authStorage = typeof window !== "undefined" ? window.sessionStorage : undefined;

// Cura usuários já "presos": remove qualquer token de auth do Supabase que tenha
// ficado no localStorage por causa da configuração antiga. Sem isto, quem já
// abriu o site antes deste fix continuaria travado até limpar o cache manualmente.
if (typeof window !== "undefined") {
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith("sb-") && k.includes("auth-token")) window.localStorage.removeItem(k);
    }
  } catch { /* ignorar — ambiente sem localStorage */ }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
