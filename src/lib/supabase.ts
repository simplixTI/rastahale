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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
