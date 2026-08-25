import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, CreditCard, Calendar, Zap, Crown, RefreshCw, XCircle, Check, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, usePlans, useUserPayments } from "@/hooks/useProfile";
import { useCheckout, useBillingPortal } from "@/hooks/useStripe";
import { useLabels } from "@/i18n/labels";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const MyPlan = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t }    = useTranslation();
  const labels   = useLabels();
  const { data: profile } = useProfile(user?.id ?? "");
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: userPayments = [] } = useUserPayments(user?.id ?? "");
  const queryClient = useQueryClient();

  const checkout      = useCheckout();
  const billingPortal = useBillingPortal();

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const planName = profile?.planName ?? "Básico";
  const plan     = plans.find((p) => p.name === planName) ?? plans[0];
  const otherPlans = plans.filter((p) => p.name !== plan?.name);

  const hasActiveSubscription = !!profile?.stripeSubscriptionId
    && (profile.subscriptionStatus === "active" || profile.subscriptionStatus === "trialing");

  const isCancelled = profile?.status === "inativo" || profile?.subscriptionStatus === "canceled";

  const nextBilling = profile?.currentPeriodEnd
    ? labels.longDate(new Date(profile.currentPeriodEnd))
    : "—";

  const isPremium = plan?.name?.toLowerCase().includes("premium") ?? false;

  // Retorno do Stripe Checkout — mostra toast e atualiza o perfil.
  // O status real vem do webhook, então damos um refetch com atraso pra
  // pegar a propagação (o webhook costuma chegar em <2s).
  useEffect(() => {
    const status = searchParams.get("checkout");
    if (!status) return;
    if (status === "success") {
      toast.success(t("plan.checkoutSuccess"));
      // Refetch em duas ondas: rápido pra UX otimista, e um mais lento
      // pra garantir que o webhook já rodou.
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-payments", user?.id] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["user-payments", user?.id] });
      }, 3000);
    } else if (status === "cancelled") {
      toast.info(t("plan.checkoutCancelled"));
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, queryClient, user?.id, t]);

  const openCheckout = async (planId: string) => {
    if (!planId) return;
    try {
      const url = await checkout.mutateAsync(planId);
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || t("plan.cancelError"));
    }
  };

  const openPortal = async () => {
    try {
      const url = await billingPortal.mutateAsync();
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || t("plan.cancelError"));
    }
  };

  const handleConfirmChoice = () => {
    if (!selectedPlanId) return;
    setShowChangePlan(false);
    // Se já tem assinatura ativa, troca de plano acontece no portal Stripe.
    // Sem assinatura: abre checkout pro plano escolhido.
    if (hasActiveSubscription) openPortal();
    else openCheckout(selectedPlanId);
    setSelectedPlanId(null);
  };

  if (plansLoading || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const busyExternal = checkout.isPending || billingPortal.isPending;

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/perfil")}
          className="rounded-full bg-card border border-border p-2 text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("plan.title")}</h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Plan card */}
        <div className={cn(
          "rounded-2xl p-5 border",
          isCancelled ? "bg-card border-border" : isPremium ? "bg-primary/10 border-primary/30" : "bg-card border-border"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isPremium ? <Crown size={18} className="text-primary" /> : <Zap size={18} className="text-primary" />}
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">{t("plan.current")}</span>
              </div>
              <h2 className="mt-1 text-2xl font-bold text-foreground">{plan.name}</h2>
            </div>
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isCancelled ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
            )}>
              {isCancelled ? t("plan.cancelled") : t("plan.active")}
            </span>
          </div>

          <div className="mt-4 flex items-end gap-1">
            <span className="text-3xl font-bold text-foreground">{labels.currency(plan.price)}</span>
            <span className="mb-1 text-sm text-muted-foreground">{labels.interval(plan.interval)}</span>
          </div>

          {isCancelled && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("plan.cancelNotice")}
            </p>
          )}
        </div>

        {/* Next billing */}
        {!isCancelled && hasActiveSubscription && (
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2.5">
              <Calendar size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("plan.nextBilling")}</p>
              <p className="text-sm font-semibold text-foreground">{nextBilling}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">{t("plan.amount")}</p>
              <p className="text-sm font-semibold text-foreground">{labels.currency(plan.price)}</p>
            </div>
          </div>
        )}

        {/* Features */}
        {plan.features?.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("plan.included")}
            </p>
            <ul className="space-y-2.5">
              {plan.features.map((feature: string) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {/* Sem assinatura ativa → Assinar (abre checkout do plano atual) */}
          {!hasActiveSubscription && (
            <button
              onClick={() => openCheckout(plan.id)}
              disabled={busyExternal}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {busyExternal ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <CreditCard size={15} />
                  {t("plan.subscribe")}
                </>
              )}
            </button>
          )}

          {/* Trocar plano (checkout ou portal, decidido dentro do handler) */}
          {otherPlans.length > 0 && (
            <button
              onClick={() => { setSelectedPlanId(null); setShowChangePlan(true); }}
              disabled={busyExternal}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              <RefreshCw size={15} />
              {t("plan.change")}
            </button>
          )}

          {/* Gerenciar / cancelar → sempre pelo portal Stripe */}
          {hasActiveSubscription && (
            <button
              onClick={openPortal}
              disabled={busyExternal}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              <ExternalLink size={15} />
              {t("plan.manage")}
            </button>
          )}

          {/* Sem assinatura ativa e status cancelado → mostrar reativar */}
          {!hasActiveSubscription && isCancelled && (
            <button
              onClick={() => openCheckout(plan.id)}
              disabled={busyExternal}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={15} />
              {t("plan.reactivate")}
            </button>
          )}
        </div>

        {/* Payment history */}
        {userPayments.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("plan.history")}
            </p>
            <ul className="space-y-3">
              {userPayments.slice(0, 4).map((payment) => (
                <li key={payment.id} className="flex items-center gap-3">
                  <div className="rounded-full bg-card border border-border p-2">
                    <CreditCard size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{payment.plan_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {labels.shortDate(payment.date)} · {payment.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{labels.currency(payment.amount)}</p>
                    <span className={cn(
                      "text-[10px] font-medium",
                      payment.status === "pago" ? "text-emerald-400" :
                      payment.status === "pendente" ? "text-amber-400" : "text-red-400"
                    )}>
                      {labels.payStatus(payment.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sheet — Escolher plano (checkout ou portal) */}
      <Sheet open={showChangePlan} onOpenChange={setShowChangePlan}>
        <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl px-4 pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-foreground text-left">{t("plan.choose")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3">
            {plans.map((p) => {
              const isCurrentPlan = p.name === plan.name;
              const isSelected = selectedPlanId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => !isCurrentPlan && setSelectedPlanId(p.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    isCurrentPlan
                      ? "border-border bg-card/50 opacity-50 cursor-not-allowed"
                      : isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  )}
                  disabled={isCurrentPlan}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {labels.currency(p.price)} {labels.interval(p.interval)}
                      </p>
                    </div>
                    {isCurrentPlan ? (
                      <span className="text-[10px] font-semibold text-muted-foreground">{t("plan.currentBadge")}</span>
                    ) : isSelected ? (
                      <div className="rounded-full bg-primary p-1">
                        <Check size={12} className="text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" />
                    )}
                  </div>
                  {p.features?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {p.features.slice(0, 3).map((f: string) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CheckCircle size={10} className="text-emerald-400 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>

          {/* Aviso de qual fluxo será usado ao confirmar. */}
          {hasActiveSubscription ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("plan.changeViaPortalHint")}
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t("plan.changeViaCheckoutHint")}
            </p>
          )}

          <button
            onClick={handleConfirmChoice}
            disabled={!selectedPlanId || busyExternal}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            {busyExternal ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              t(hasActiveSubscription ? "plan.openPortal" : "plan.goToCheckout")
            )}
          </button>
        </SheetContent>
      </Sheet>

      {/* Aviso: Dialog interno de cancelar foi removido — cancelamento acontece no portal Stripe. */}

    </div>
  );
};

export default MyPlan;
