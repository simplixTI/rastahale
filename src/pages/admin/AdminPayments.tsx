import { useState, useMemo } from "react";
import { CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPayments, useUpdatePaymentStatus } from "@/hooks/useAdminData";
import { getStatusColor } from "@/data/mockData";
import { cn } from "@/lib/utils";

const AdminPayments = () => {
  const { data: payments = [], isLoading } = useAdminPayments();
  const updateStatus = useUpdatePaymentStatus();
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [methodFilter, setMethodFilter] = useState<string>("todos");

  const statuses = ["todos", "pago", "pendente", "falhou"];
  const methods   = ["todos", "PIX", "Cartão", "Boleto"];

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
      const matchesMethod = methodFilter === "todos" || p.method === methodFilter;
      return matchesStatus && matchesMethod;
    });
  }, [payments, statusFilter, methodFilter]);

  const totalPaid    = payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.amount), 0);
  const totalFailed  = payments.filter((p) => p.status === "falhou").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <AdminLayout title="Pagamentos">
      <h2 className="text-lg font-bold text-foreground">Gerenciar Pagamentos</h2>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center">
          <TrendingUp size={16} className="mx-auto text-emerald-400" />
          <p className="mt-1 text-sm font-bold text-emerald-400">R$ {totalPaid.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Recebido</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
          <AlertCircle size={16} className="mx-auto text-amber-400" />
          <p className="mt-1 text-sm font-bold text-amber-400">R$ {totalPending.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Pendente</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-center">
          <TrendingDown size={16} className="mx-auto text-red-400" />
          <p className="mt-1 text-sm font-bold text-red-400">R$ {totalFailed.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Falhou</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
        <div className="flex gap-1.5">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Método</p>
        <div className="flex gap-1.5">
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                methodFilter === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              {m === "todos" ? "Todos" : m}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((p) => {
            const StatusIcon = p.status === "pago" ? CheckCircle : p.status === "pendente" ? AlertCircle : XCircle;
            const iconColor = p.status === "pago" ? "text-emerald-400" : p.status === "pendente" ? "text-amber-400" : "text-red-400";

            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <StatusIcon size={20} className={iconColor} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{p.user_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.plan_name} · {p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">R$ {Number(p.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{p.date}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize", getStatusColor(p.status))}>
                    {p.status}
                  </span>
                  {p.status === "pendente" && (
                    <button
                      onClick={() => toast.success("Cobrança reenviada ao aluno")}
                      className="text-[10px] font-medium text-primary"
                    >
                      Reenviar cobrança
                    </button>
                  )}
                  {p.status === "falhou" && (
                    <button
                      onClick={() => updateStatus.mutate(
                        { paymentId: p.id, status: "pendente" },
                        { onSuccess: () => toast.success("Pagamento reativado para pendente") }
                      )}
                      disabled={updateStatus.isPending}
                      className="text-[10px] font-medium text-primary disabled:opacity-50"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPayments;
