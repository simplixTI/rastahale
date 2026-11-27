// Ativação manual (migration 025): o admin recebeu o pagamento fora do Stripe
// (Pix, maquininha...) e libera o aluno no plano mensal ou anual. Sem conta
// no app, o acesso fica reservado e a conta já nasce liberada no cadastro.
import { useEffect, useMemo, useState } from "react";
import { Clock, KeyRound, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import LoadError from "@/components/LoadError";
import { useAdminPlans } from "@/hooks/useAdminData";
import {
  useCancelPendingAccess,
  useGrantAccess,
  useManualAccessList,
  usePendingAccessList,
  useRevokeManualAccess,
  type PaymentMethod,
} from "@/hooks/useManualAccess";
import { cn } from "@/lib/utils";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const METHODS: PaymentMethod[] = ["PIX", "Cartão", "Boleto"];

/** "214" / "214,00" / "R$ 1.214,90" → número; vazio ou inválido → NaN. */
function parseAmount(text: string): number {
  const clean = text.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(clean);
  return clean && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

function GrantForm() {
  const { data: allPlans = [], isLoading } = useAdminPlans();
  const plans = useMemo(
    () => allPlans.filter((p) => p.active).sort((a, b) => a.price - b.price),
    [allPlans],
  );
  const grant = useGrantAccess();

  const [email, setEmail]   = useState("");
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("PIX");

  const plan = plans.find((p) => p.id === planId);

  // Primeiro plano selecionado por padrão; o valor acompanha o plano escolhido.
  useEffect(() => {
    if (!planId && plans.length > 0) setPlanId(plans[0].id);
  }, [plans, planId]);
  useEffect(() => {
    if (plan) setAmount(plan.price.toFixed(2).replace(".", ","));
  }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    const value = parseAmount(amount);
    if (!email.trim()) { toast.error("Informe o e-mail do aluno"); return; }
    if (!plan) { toast.error("Escolha o plano"); return; }
    if (Number.isNaN(value)) { toast.error("Valor inválido. Use, por exemplo, 214,00"); return; }

    grant.mutate({ email: email.trim(), planId: plan.id, amount: value, method }, {
      onSuccess: (r) => {
        if (r?.result === "reservado") {
          toast.success(`Acesso reservado até ${day(r.period_end)}. Libera quando ${email.trim()} criar a conta com este e-mail.`);
        } else {
          toast.success(`${plan.name} ativo até ${day(r?.period_end ?? null)}`);
        }
        setEmail("");
      },
      onError: (e) => toast.error(`Erro ao ativar: ${(e as Error).message}`),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <label className="block">
        <span className="text-[11px] font-medium text-muted-foreground">E-mail do aluno</span>
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="aluno@email.com"
          className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <div>
        <span className="text-[11px] font-medium text-muted-foreground">Plano</span>
        {isLoading ? (
          <div className="mt-2 flex justify-center"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-1 grid grid-cols-2 gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left",
                  p.id === planId ? "border-primary bg-primary/10" : "border-border bg-secondary",
                )}
              >
                <p className="text-xs font-semibold text-foreground">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.interval === "anual" ? "1 ano" : p.interval === "trimestral" ? "3 meses" : "1 mês"} de acesso
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Valor recebido</span>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </label>
        <div>
          <span className="text-[11px] font-medium text-muted-foreground">Forma</span>
          <div className="mt-1 flex gap-1">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-[11px] font-medium",
                  m === method ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary text-muted-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={grant.isPending || !plan}
        className="flex w-full items-center justify-center gap-2 rounded-full btn-press bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {grant.isPending ? <Loader2 size={15} className="animate-spin" /> : <><UserCheck size={15} /> Ativar acesso</>}
      </button>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        O pagamento entra em Pagamentos. Se o aluno ainda tem acesso manual, o novo período soma ao que
        falta. No fim do período o acesso é desligado sozinho.
      </p>
    </div>
  );
}

function ActiveList() {
  const { data = [], isLoading, isError, refetch } = useManualAccessList();
  const revoke = useRevokeManualAccess();

  if (isLoading) return <div className="mt-3 flex justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  if (isError) return <div className="mt-3"><LoadError onRetry={() => refetch()} /></div>;
  if (data.length === 0) return <p className="mt-3 text-center text-xs text-muted-foreground">Nenhum acesso manual ainda</p>;

  return (
    <div className="mt-3 space-y-2">
      {data.map((a) => {
        const active = a.status === "ativo";
        return (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{a.name || a.email}</p>
              <p className="truncate text-[11px] text-muted-foreground">{a.email}</p>
              <p className="text-[11px] text-muted-foreground">
                {a.planName} · {active ? `até ${day(a.periodEnd)}` : `venceu em ${day(a.periodEnd)}`}
              </p>
            </div>
            {active ? (
              <button
                onClick={() => {
                  if (!window.confirm(`Remover o acesso de ${a.email} agora?`)) return;
                  revoke.mutate(a.id, {
                    onSuccess: () => toast.success("Acesso removido"),
                    onError:   (e) => toast.error(`Erro: ${(e as Error).message}`),
                  });
                }}
                disabled={revoke.isPending}
                className="flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Remover
              </button>
            ) : (
              <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Vencido</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PendingList() {
  const { data = [], isLoading, isError, refetch } = usePendingAccessList();
  const cancel = useCancelPendingAccess();

  if (isLoading) return <div className="mt-3 flex justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  if (isError) return <div className="mt-3"><LoadError onRetry={() => refetch()} /></div>;
  if (data.length === 0) return <p className="mt-3 text-center text-xs text-muted-foreground">Ninguém aguardando cadastro</p>;

  return (
    <div className="mt-3 space-y-2">
      {data.map((p) => (
        <div key={p.email} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{p.email}</p>
            <p className="text-[11px] text-muted-foreground">
              {p.planName ?? "—"} · até {day(p.periodEnd)} · {p.source === "manual" ? "ativação manual" : "pago no Stripe"}
            </p>
          </div>
          {p.source === "manual" && (
            <button
              onClick={() => {
                if (!window.confirm(`Cancelar a reserva de ${p.email}?`)) return;
                cancel.mutate(p.email, {
                  onSuccess: () => toast.success("Reserva cancelada"),
                  onError:   (e) => toast.error(`Erro: ${(e as Error).message}`),
                });
              }}
              disabled={cancel.isPending}
              className="flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Cancelar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const AdminManualAccess = () => (
  <AdminLayout title="Ativação manual" backTo="/admin">
    <div className="flex items-center gap-2">
      <KeyRound size={18} className="text-primary" />
      <h2 className="text-lg font-bold text-foreground">Ativação manual</h2>
    </div>
    <p className="mt-1 text-[11px] text-muted-foreground">
      Recebeu o pagamento por fora do Stripe (Pix, maquininha)? Ative o aluno aqui. Se ele ainda não
      tem conta, o acesso fica reservado e libera assim que ele se cadastrar com o mesmo e-mail.
    </p>

    <div className="mt-4"><GrantForm /></div>

    <h3 className="mt-6 text-sm font-semibold text-foreground">Acessos manuais</h3>
    <ActiveList />

    <h3 className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-foreground">
      <Clock size={14} /> Pagos aguardando cadastro
    </h3>
    <PendingList />
    <div className="pb-6" />
  </AdminLayout>
);

export default AdminManualAccess;
