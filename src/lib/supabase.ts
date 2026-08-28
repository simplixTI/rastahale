import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
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

// Storage do token de auth.
//
// Web: sessionStorage (por-aba) em vez do localStorage padrão do Supabase.
// Motivo: o app trata "fechar a aba = logout" (ver CLAUDE.md e AuthContext,
// que já persiste o usuário em sessionStorage). Com o token no localStorage,
// ele SOBREVIVIA ao fechamento da aba; ao reabrir, a restauração da sessão
// encontrava um token velho/expirado, travava o refresh e IMPEDIA novos
// logins ("não entra em nenhuma conta até limpar o cache do site").
// sessionStorage some junto com a aba, então cada reabertura começa limpa.
//
// App nativo (Capacitor): localStorage. O checkout do Stripe abre no browser
// externo e o Android costuma MATAR o processo do app enquanto o usuário paga;
// sessionStorage não sobrevive à morte do processo, então ao voltar pelo
// deep link o app abria deslogado (usuário caía na tela de login logo após
// pagar). localStorage persiste entre processos, igual a qualquer app nativo.
const isNative = Capacitor.isNativePlatform();
const authStorage = typeof window !== "undefined"
  ? (isNative ? window.localStorage : window.sessionStorage)
  : undefined;

// Migração one-time no app nativo: quem estava logado com o token no
// sessionStorage (config antiga) tem o token copiado pro localStorage,
// evitando logout forçado na primeira abertura após o update.
if (isNative) {
  try {
    for (const k of Object.keys(window.sessionStorage)) {
      if (k.startsWith("sb-") && k.includes("auth-token") && !window.localStorage.getItem(k)) {
        const v = window.sessionStorage.getItem(k);
        if (v) window.localStorage.setItem(k, v);
      }
    }
  } catch { /* ignorar — storage indisponível */ }
}

// Cura usuários já "presos" (web apenas): remove qualquer token de auth do
// Supabase que tenha ficado no localStorage por causa da configuração antiga.
// Sem isto, quem já abriu o site antes do fix do sessionStorage continuaria
// travado até limpar o cache manualmente. No app nativo NÃO roda — lá o
// localStorage é o storage legítimo da sessão.
if (typeof window !== "undefined" && !isNative) {
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
