// Ativação manual pelo admin (migration 025): pagamento recebido fora do
// Stripe (Pix, maquininha...) libera o aluno no plano mensal ou anual.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PaymentMethod = "PIX" | "Cartão" | "Boleto";

export interface ManualAccess {
  id: string;
  name: string;
  email: string;
  planName: string;
  status: string;
  periodEnd: string | null;
}

export interface PendingAccess {
  email: string;
  planName: string | null;
  periodEnd: string | null;
  source: "stripe" | "manual";
  createdAt: string;
}

/** Alunos com acesso dado pelo admin, os que vencem primeiro no topo. */
export function useManualAccessList() {
  return useQuery({
    queryKey: ["manual-access"],
    queryFn: async (): Promise<ManualAccess[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, plan_name, status, current_period_end")
        .eq("subscription_source", "manual")
        .order("current_period_end", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id:        p.id,
        name:      p.name,
        email:     p.email,
        planName:  p.plan_name,
        status:    p.status,
        periodEnd: p.current_period_end,
      }));
    },
  });
}

/** Pagos (Stripe ou admin) que ainda não criaram a conta. */
export function usePendingAccessList() {
  return useQuery({
    queryKey: ["pending-access"],
    queryFn: async (): Promise<PendingAccess[]> => {
      const { data, error } = await supabase
        .from("stripe_pending_access")
        .select("email, plan_name, current_period_end, source, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        email:     r.email,
        planName:  r.plan_name,
        periodEnd: r.current_period_end,
        source:    r.source === "manual" ? "manual" : "stripe",
        createdAt: r.created_at,
      }));
    },
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["manual-access", "pending-access", "admin-users", "admin-payments", "admin-dashboard"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useGrantAccess() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { email: string; planId: string; amount: number; method: PaymentMethod }) => {
      const { data, error } = await supabase.rpc("admin_grant_access", {
        p_email:   input.email,
        p_plan_id: input.planId,
        p_amount:  input.amount,
        p_method:  input.method,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { result: "ativado" | "reservado"; period_end: string };
    },
    onSuccess: invalidate,
  });
}

export function useRevokeManualAccess() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_revoke_manual_access", { p_user: userId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCancelPendingAccess() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from("stripe_pending_access").delete().eq("email", email);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
