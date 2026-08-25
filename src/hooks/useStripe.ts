// Hooks para as edge functions do Stripe.
// - useCheckout: cria uma sessão de checkout e devolve a URL pra redirecionar.
// - useBillingPortal: abre o portal do cliente Stripe (gerenciar/cancelar).
// - useSyncPlan: (admin) sincroniza um plano do banco com o Stripe.
import { useMutation } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

async function invokeFn<T>(name: string, body?: unknown): Promise<T> {
  if (!isSupabaseConfigured) {
    throw new Error("Stripe indisponível: Supabase não está configurado.");
  }
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });
  if (error) throw new Error(error.message || `Falha ao chamar ${name}`);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const { url } = await invokeFn<{ url: string }>("create-checkout", { planId });
      if (!url) throw new Error("Stripe não retornou URL de checkout");
      return url;
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await invokeFn<{ url: string }>("create-portal");
      if (!url) throw new Error("Stripe não retornou URL do portal");
      return url;
    },
  });
}

export function useSyncPlanWithStripe() {
  return useMutation({
    mutationFn: async (planId: string) => {
      return invokeFn<{ ok: true; productId: string; priceId: string }>(
        "admin-sync-plan",
        { planId },
      );
    },
  });
}
