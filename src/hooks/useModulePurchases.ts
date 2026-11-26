// Venda avulsa de módulos (migration 022).
// - useModuleAccess: módulos que o aluno comprou e as aulas que eles liberam.
// - useBuyModule: abre o checkout do Stripe para um módulo (só na web).
// - useAllModuleSales / useSetModulePrice: tela do admin.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const MODULE_ACCESS_KEY = ["module-access"];

export interface ModuleAccess {
  moduleIds: Set<string>;
  videoIds:  Set<string>;
}

const EMPTY: ModuleAccess = { moduleIds: new Set(), videoIds: new Set() };

/** Depois do Stripe a página volta com ?compra=ok; o webhook pode levar alguns segundos. */
function returningFromPurchase(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("compra") === "ok";
}

export function useModuleAccess() {
  const { user } = useAuth();
  const [polling, setPolling] = useState(returningFromPurchase);

  // Para de consultar depois de 40 s mesmo que a compra não tenha chegado.
  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => setPolling(false), 40_000);
    return () => clearTimeout(timer);
  }, [polling]);

  const query = useQuery({
    queryKey: [...MODULE_ACCESS_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user?.id,
    queryFn: async (): Promise<ModuleAccess> => {
      const { data, error } = await supabase
        .from("module_purchases")
        .select("module_id, studio_sessions(video_ids)")
        .eq("user_id", user!.id);
      if (error) throw error;
      const moduleIds = new Set<string>();
      const videoIds  = new Set<string>();
      for (const row of data ?? []) {
        moduleIds.add(row.module_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ids: string[] = (row as any).studio_sessions?.video_ids ?? [];
        ids.forEach((id) => videoIds.add(id));
      }
      return { moduleIds, videoIds };
    },
    refetchInterval: polling ? 2_000 : false,
  });

  return { ...query, access: query.data ?? EMPTY };
}

export function useBuyModule() {
  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { moduleId, returnPath: window.location.pathname },
      });
      if (error) throw new Error(error.message || "Falha ao abrir o pagamento");
      if (data?.error) throw new Error(String(data.error));
      if (!data?.url) throw new Error("Stripe não retornou URL de pagamento");
      window.location.href = data.url as string;
    },
  });
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface ModuleSale {
  id:             string;
  title:          string;
  instructorId:   string;
  instructorName: string;
  lessons:        number;
  price:          number | null;
  sales:          number;
  revenue:        number;
}

export function useAllModuleSales() {
  return useQuery({
    queryKey: ["admin-module-sales"],
    enabled: isSupabaseConfigured,
    queryFn: async (): Promise<ModuleSale[]> => {
      const [sessions, instructors, purchases] = await Promise.all([
        supabase.from("studio_sessions").select("id, title, instructor_id, video_ids, price, position").order("position"),
        supabase.from("instructors").select("id, name"),
        supabase.from("module_purchases").select("module_id, amount"),
      ]);
      const err = sessions.error ?? instructors.error ?? purchases.error;
      if (err) throw err;
      const names = new Map((instructors.data ?? []).map((i) => [i.id, i.name]));
      return (sessions.data ?? []).map((s) => {
        const mine = (purchases.data ?? []).filter((p) => p.module_id === s.id);
        return {
          id:             s.id,
          title:          s.title,
          instructorId:   s.instructor_id,
          instructorName: names.get(s.instructor_id) ?? "—",
          lessons:        (s.video_ids ?? []).length,
          price:          s.price != null ? Number(s.price) : null,
          sales:          mine.length,
          revenue:        mine.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
        };
      });
    },
  });
}

export function useSetModulePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number | null }) => {
      const { error } = await supabase.from("studio_sessions").update({ price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-module-sales"] });
      qc.invalidateQueries({ queryKey: ["studio-sessions"] });
    },
  });
}
