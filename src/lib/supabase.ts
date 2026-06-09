import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Fallback para quando as env vars não estão configuradas (ex: deploy sem .env)
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
