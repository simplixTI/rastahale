// Compra avulsa de um módulo (migration 022): pagamento único no Stripe,
// acesso vitalício às aulas do módulo.
//
// Só aparece na web. No app das lojas, vender conteúdo digital com pagamento
// de fora viola a Apple (3.1.1) e o Google Play; lá a compra vai entrar pela
// loja (RevenueCat) quando for configurada.
import { useEffect } from "react";
import { CheckCircle, Loader2, ShoppingCart } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useBuyModule, useModuleAccess } from "@/hooks/useModulePurchases";
import { canWatchLessons } from "@/lib/access";
import { useLabels } from "@/i18n/labels";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Props {
  module: { id: string; price: number | null };
  className?: string;
  /** "dark" para usar por cima do player bloqueado. */
  tone?: "default" | "dark";
}

const BuyModuleButton = ({ module, className, tone = "default" }: Props) => {
  const { t } = useTranslation();
  const labels = useLabels();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id ?? "");
  const { access } = useModuleAccess();
  const buy = useBuyModule();

  const owned = access.moduleIds.has(module.id);

  // Volta do Stripe: avisa uma vez (o id do toast evita repetir quando a
  // página tem vários botões).
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("compra");
    if (flag === "cancelada") toast.info(t("modulePurchase.cancelled"), { id: "compra-modulo" });
    else if (flag === "ok" && owned) toast.success(t("modulePurchase.success"), { id: "compra-modulo" });
    else if (flag === "ok") toast.loading(t("modulePurchase.confirming"), { id: "compra-modulo", duration: 40_000 });
  }, [owned, t]);

  if (!isSupabaseConfigured || !user) return null;
  // Quem já assiste tudo (plano ativo ou equipe) não precisa comprar.
  if (canWatchLessons(user.role, profile?.status)) return null;

  if (owned) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium",
        tone === "dark" ? "bg-white/15 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        className,
      )}>
        <CheckCircle size={12} aria-hidden="true" /> {t("modulePurchase.owned")}
      </span>
    );
  }

  if (!module.price || Capacitor.isNativePlatform()) return null;

  return (
    <button
      type="button"
      disabled={buy.isPending}
      onClick={(e) => {
        e.stopPropagation();
        buy.mutate(module.id, { onError: (err) => toast.error((err as Error).message) });
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold btn-press disabled:opacity-60",
        tone === "dark" ? "bg-white text-black" : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {buy.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} aria-hidden="true" />}
      {t("modulePurchase.buy", { price: labels.currency(module.price) })}
    </button>
  );
};

export default BuyModuleButton;
