import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Info, RotateCcw } from "lucide-react";
import { useLabels } from "@/i18n/labels";
import {
  getIapPackages,
  purchaseIapPackage,
  restoreIapPurchases,
  type IapPackage,
} from "@/lib/purchases";

// Período da loja (ISO 8601) → intervalo que os rótulos do app já conhecem.
const PERIOD_TO_INTERVAL: Record<string, string> = {
  P1M: "mensal",
  P3M: "trimestral",
  P1Y: "anual",
};

const STORE_SUBSCRIPTIONS_URL: Record<string, string> = {
  ios:     "https://apps.apple.com/account/subscriptions",
  android: "https://play.google.com/store/account/subscriptions",
};

interface Props {
  userId: string;
  /** Conta com acesso liberado (profiles.status = 'ativo'). */
  isActive: boolean;
  /** 'app_store' | 'play_store' quando a assinatura em vigor foi comprada no app. */
  subscriptionSource?: string | null;
}

/**
 * Ações de assinatura no app nativo: compra pela loja (App Store / Google
 * Play via RevenueCat), restaurar compras e gerenciar. Quem libera o acesso é
 * o webhook do RevenueCat — aqui só refazemos a leitura do perfil depois.
 */
const IapPlanActions = ({ userId, isActive, subscriptionSource }: Props) => {
  const { t }       = useTranslation();
  const labels      = useLabels();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const boughtInStore = subscriptionSource === "app_store" || subscriptionSource === "play_store";

  const { data: packages = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["iap-packages", userId],
    queryFn:  () => getIapPackages(userId),
    enabled:  !!userId && !isActive,
    staleTime: 5 * 60 * 1000,
    // Uma tentativa extra só: se a loja não entrega os produtos, mostrar o erro
    // logo em vez de deixar o aluno olhando o carregamento por meio minuto.
    retry: 1,
  });

  // O webhook costuma chegar em poucos segundos; relemos o perfil em ondas.
  const refreshProfile = () => {
    for (const delay of [0, 3000, 8000]) {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["profile", userId] }), delay);
    }
  };

  const buy = async (pkg: IapPackage) => {
    setBusy(pkg.identifier);
    try {
      const result = await purchaseIapPackage(userId, pkg);
      if (result === "purchased") {
        toast.success(t("plan.iapSuccess"));
        refreshProfile();
      }
    } catch {
      toast.error(t("plan.iapError"));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      const found = await restoreIapPurchases(userId);
      if (found) {
        toast.success(t("plan.iapRestored"));
        refreshProfile();
      } else {
        toast.info(t("plan.iapNothingToRestore"));
      }
    } catch {
      toast.error(t("plan.iapError"));
    } finally {
      setBusy(null);
    }
  };

  // Já tem acesso: só gerenciar (se comprou na loja) ou um aviso neutro.
  if (isActive) {
    const url = STORE_SUBSCRIPTIONS_URL[Capacitor.getPlatform()];
    return boughtInStore && url ? (
      <button
        onClick={() => window.open(url, "_blank")}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground"
      >
        <ExternalLink size={15} />
        {t("plan.iapManage")}
      </button>
    ) : (
      <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
          <Info size={18} className="text-primary" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("plan.iapManagedElsewhere")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("plan.iapChoose")}
      </p>

      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {isError && (
        <button
          onClick={() => refetch()}
          className="w-full rounded-xl border border-border bg-card p-4 text-left text-sm text-muted-foreground"
        >
          {t("plan.iapLoadError")}
        </button>
      )}

      {!isLoading && !isError && packages.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("plan.iapNoPackages")}
        </p>
      )}

      {packages.map((pkg) => {
        const interval = PERIOD_TO_INTERVAL[pkg.product.subscriptionPeriod ?? ""];
        // Oferta de entrada da Apple (ex.: R$ 214,90 no 1º ano). A janela de
        // compra da Apple mostra o valor final; aqui deixamos claro o preço
        // da oferta e o da renovação.
        const intro = pkg.product.introPrice;
        const regular = (
          <>
            {pkg.product.priceString}
            {interval && <span className="text-muted-foreground"> {labels.interval(interval)}</span>}
          </>
        );
        return (
          <div key={pkg.identifier} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-foreground">{pkg.product.title}</p>
              {intro && intro.price > 0 ? (
                <>
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {t(intro.periodUnit === "YEAR" ? "plan.iapIntroYear" : "plan.iapIntroPrice", { price: intro.priceString })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("plan.iapIntroThen")} {regular}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-sm text-foreground">{regular}</p>
              )}
              {pkg.product.description && (
                <p className="mt-1 text-xs text-muted-foreground">{pkg.product.description}</p>
              )}
            </div>
            <button
              onClick={() => buy(pkg)}
              disabled={busy !== null}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy === pkg.identifier ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <CreditCard size={15} />
                  {t("plan.iapSubscribe")}
                </>
              )}
            </button>
          </div>
        );
      })}

      <button
        onClick={restore}
        disabled={busy !== null}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground disabled:opacity-60"
      >
        <RotateCcw size={15} />
        {t("plan.iapRestore")}
      </button>

      {/* A Apple exige, na tela de compra, a regra de renovação e os links
          para os termos e a política de privacidade (guideline 3.1.2). */}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("plan.iapLegal")}{" "}
        <button onClick={() => navigate("/termos")} className="underline">{t("plan.iapTerms")}</button>
        {" · "}
        <button onClick={() => navigate("/privacidade")} className="underline">{t("plan.iapPrivacy")}</button>
      </p>
    </div>
  );
};

export default IapPlanActions;
