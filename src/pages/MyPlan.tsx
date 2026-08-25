import { useState } from "react";
import { ArrowLeft, CheckCircle, CreditCard, Calendar, Zap, Crown, RefreshCw, XCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, usePlans, useUserPayments, useUpdatePlanName } from "@/hooks/useProfile";
import { useProfileOverride } from "@/contexts/ProfileContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useLabels } from "@/i18n/labels";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** true para usuários reais do Supabase Auth (id UUID); mock usa ids "u-…". */
function isSupabaseUser(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

/** Data da próxima cobrança a partir do último pagamento e do intervalo. */
function nextBillingDate(lastDateStr: string, interval: string): Date {
  const date = new Date(lastDateStr + "T00:00:00");
  if (interval === "mensal") date.setMonth(date.getMonth() + 1);
  else if (interval === "trimestral") date.setMonth(date.getMonth() + 3);
  else if (interval === "anual") date.setFullYear(date.getFullYear() + 1);
  return date;
}

const MyPlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t }    = useTranslation();
  const labels   = useLabels();
  const { data: profile } = useProfile(user?.id ?? "");
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: userPayments = [] } = useUserPayments(user?.id ?? "");
  const updatePlanName = useUpdatePlanName();
  const { override, updateOverride } = useProfileOverride();
  const queryClient = useQueryClient();

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const planName = override.planName ?? profile?.planName ?? "Premium";
  const isCancelled = override.planCancelled ?? false;
  const plan = plans.find((p) => p.name === planName) ?? plans[0];
  const otherPlans = plans.filter((p) => p.name !== plan?.name);

  const lastPayment = userPayments[0];
  const nextBilling = lastPayment && plan
    ? labels.longDate(nextBillingDate(lastPayment.date, plan.interval))
    : "—";

  const isPremium = plan?.name?.toLowerCase().includes("premium") ?? false;

  const handleChangePlan = async () => {
    if (!selectedPlanId || !user) return;
    const newPlan = plans.find((p) => p.id === selectedPlanId);
    if (!newPlan) return;
    setChanging(true);
    try {
      await updatePlanName.mutateAsync({ userId: user.id, planName: newPlan.name });
      // Reativação: o cancelamento grava status "inativo" no perfil — volta para "ativo".
      if (isSupabaseConfigured && isSupabaseUser(user.id)) {
        await supabase.from("profiles").update({ status: "ativo" }).eq("id", user.id);
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
      updateOverride({ planName: newPlan.name, planCancelled: false });
    } finally {
      setChanging(false);
      setShowChangePlan(false);
      setSelectedPlanId(null);
    }
  };

  const handleCancelPlan = async () => {
    if (!user) return;
    setCancelling(true);
    try {
      // Cancelamento real: marca o perfil como inativo no Supabase. Sem Supabase
      // configurado, mantém o comportamento local (override em sessionStorage).
      if (isSupabaseConfigured && isSupabaseUser(user.id)) {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "inativo" })
          .eq("id", user.id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
      updateOverride({ planCancelled: true });
      setShowCancel(false);
    } catch {
      toast.error(t("plan.cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  if (plansLoading || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
        {!isCancelled && (
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
          <button
            onClick={() => { setSelectedPlanId(null); setShowChangePlan(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={15} />
            {t("plan.change")}
          </button>

          {!isCancelled && (
            <button
              onClick={() => setShowCancel(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <XCircle size={15} />
              {t("plan.cancel")}
            </button>
          )}

          {isCancelled && (
            <button
              onClick={() => { setSelectedPlanId(plan.id); setShowChangePlan(true); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
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

      {/* Sheet — Trocar Plano */}
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

          <button
            onClick={handleChangePlan}
            disabled={!selectedPlanId || changing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            {changing ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              t("plan.confirmChange")
            )}
          </button>
        </SheetContent>
      </Sheet>

      {/* Dialog — Cancelar */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="bg-background border-border max-w-[360px] mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("plan.cancelTitle")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("plan.cancelDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowCancel(false)}
              className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground"
            >
              {t("common.back")}
            </button>
            <button
              onClick={handleCancelPlan}
              disabled={cancelling}
              className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center"
            >
              {cancelling ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                t("plan.cancelConfirm")
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPlan;
