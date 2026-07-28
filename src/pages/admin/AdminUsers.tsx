import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, UserCheck, UserX, Clock, Mail, Edit2, ChevronDown, ChevronUp, Shield, ShieldOff, Check } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import {
  useAdminUsers, useAdminPayments, useUpdateUserStatus,
  useUpdateUser, useUpdateUserPlan, useAdminPlans,
} from "@/hooks/useAdminData";
import { getStatusColor } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ── Tipos internos ────────────────────────────────────────────
type AdminUser = ReturnType<typeof useAdminUsers>["data"] extends (infer U)[] ? U : never;

// ── Schema de edição de usuário ───────────────────────────────
const editSchema = z.object({
  name:      z.string().min(3, "Mínimo 3 caracteres"),
  email:     z.string().email("Email inválido"),
  avatarUrl: z.string().url("URL inválida").or(z.literal("")),
});
type EditForm = z.infer<typeof editSchema>;

// ── Schema de email ───────────────────────────────────────────
const emailSchema = z.object({
  subject: z.string().min(3, "Mínimo 3 caracteres"),
  message: z.string().min(10, "Mínimo 10 caracteres"),
});
type EmailForm = z.infer<typeof emailSchema>;

// ── Estilos reutilizáveis ─────────────────────────────────────
const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

// ── Modal: Editar usuário ─────────────────────────────────────
function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const updateUser = useUpdateUser();
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, email: user.email, avatarUrl: user.avatar_url ?? "" },
  });

  const onSubmit = (values: EditForm) => {
    updateUser.mutate(
      { userId: user.id, name: values.name, email: values.email, avatarUrl: values.avatarUrl },
      {
        onSuccess: () => { toast.success("Usuário atualizado"); onClose(); },
        onError:   () => toast.error("Erro ao atualizar"),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="border-border bg-background sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          <div>
            <label className={labelCls}>Nome</label>
            <input {...register("name")} className={fieldCls} placeholder="Nome completo" />
            {errors.name && <p className="mt-0.5 text-[10px] text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input {...register("email")} className={fieldCls} placeholder="email@exemplo.com" />
            {errors.email && <p className="mt-0.5 text-[10px] text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Avatar (URL)</label>
            <input {...register("avatarUrl")} className={fieldCls} placeholder="https://..." />
            {errors.avatarUrl && <p className="mt-0.5 text-[10px] text-red-400">{errors.avatarUrl.message}</p>}
          </div>
          <DialogFooter className="pt-1">
            <button type="button" onClick={onClose} className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={updateUser.isPending} className="rounded-2xl btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
              {updateUser.isPending ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal: Enviar email ───────────────────────────────────────
function EmailModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { subject: "", message: "" },
  });

  const onSubmit = (_values: EmailForm) => {
    toast.success(`Email enviado para ${user.email}`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="border-border bg-background sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">Enviar Email</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-1">
          <div>
            <label className={labelCls}>Para</label>
            <input value={user.email} readOnly disabled aria-disabled="true" className={cn(fieldCls, "opacity-60 cursor-not-allowed")} />
          </div>
          <div>
            <label className={labelCls}>Assunto</label>
            <input {...register("subject")} className={fieldCls} placeholder="Ex: Informações sobre seu plano" />
            {errors.subject && <p className="mt-0.5 text-[10px] text-red-400">{errors.subject.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Mensagem</label>
            <textarea {...register("message")} rows={4} className={cn(fieldCls, "resize-none")} placeholder="Digite sua mensagem..." />
            {errors.message && <p className="mt-0.5 text-[10px] text-red-400">{errors.message.message}</p>}
          </div>
          <DialogFooter className="pt-1">
            <button type="button" onClick={onClose} className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
              Cancelar
            </button>
            <button type="submit" className="rounded-2xl btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
              Enviar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal: Alterar plano ──────────────────────────────────────
function ChangePlanModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data: plans = [] } = useAdminPlans();
  const updatePlan = useUpdateUserPlan();
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const plan = plans.find((p) => p.id === selected);
    if (!plan) return;
    updatePlan.mutate(
      { userId: user.id, plan: plan.name },
      {
        onSuccess: () => { toast.success(`Plano alterado para ${plan.name}`); onClose(); },
        onError:   () => toast.error("Erro ao alterar plano"),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-background sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">Alterar Plano — {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-1">
          {plans.map((p) => {
            const isCurrent  = p.name === user.plan_name;
            const isSelected = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => !isCurrent && setSelected(p.id)}
                disabled={isCurrent}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  isCurrent  ? "border-border bg-secondary/50 opacity-50 cursor-not-allowed"
                  : isSelected ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      R$ {Number(p.price).toFixed(2)} / {p.interval}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] font-semibold text-muted-foreground">Atual</span>
                  ) : isSelected ? (
                    <div className="rounded-full bg-primary p-1">
                      <Check size={10} className="text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-border" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter className="pt-2">
          <button type="button" onClick={onClose} className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || updatePlan.isPending}
            className="rounded-2xl btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
          >
            {updatePlan.isPending ? "Salvando..." : "Confirmar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────
type ModalType = "edit" | "email" | "plan" | null;

const AdminUsers = () => {
  const { data: users = [], isLoading } = useAdminUsers();
  const { data: payments = [] }         = useAdminPayments();
  const updateStatus                    = useUpdateUserStatus();

  const [query, setQuery]               = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [modal, setModal]               = useState<{ type: ModalType; user: AdminUser | null }>({ type: null, user: null });

  const statuses = ["todos", "ativo", "pendente", "inativo"];

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesQuery  = !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "todos" || u.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [users, query, statusFilter]);

  const totalActive   = users.filter((u) => u.status === "ativo").length;
  const totalPending  = users.filter((u) => u.status === "pendente").length;
  const totalInactive = users.filter((u) => u.status === "inativo").length;

  const openModal = (type: ModalType, user: AdminUser) => setModal({ type, user });
  const closeModal = () => setModal({ type: null, user: null });

  return (
    <AdminLayout title="Usuários">
      {/* Modais */}
      {modal.type === "edit"  && modal.user && <EditUserModal   user={modal.user} onClose={closeModal} />}
      {modal.type === "email" && modal.user && <EmailModal      user={modal.user} onClose={closeModal} />}
      {modal.type === "plan"  && modal.user && <ChangePlanModal user={modal.user} onClose={closeModal} />}

      <h2 className="text-lg font-bold text-foreground">Gerenciar Usuários</h2>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { icon: UserCheck, color: "text-emerald-400", value: totalActive,   label: "Ativos"    },
          { icon: Clock,     color: "text-amber-400",   value: totalPending,  label: "Pendentes" },
          { icon: UserX,     color: "text-red-400",     value: totalInactive, label: "Inativos"  },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-2.5 text-center">
            <s.icon size={16} className={cn("mx-auto", s.color)} />
            <p className="mt-1 text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mt-3 flex gap-1.5">
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

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((u) => {
            const isExpanded  = expandedUser === u.id;
            const userPayments = payments.filter((p) => p.user_id === u.id);

            return (
              <div key={u.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <img
                    src={u.avatar_url || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=50&h=50&fit=crop"}
                    alt={u.name}
                    className="h-11 w-11 rounded-full object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">{u.plan_name}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize", getStatusColor(u.status))}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {[
                        { label: "Desde",            value: u.join_date },
                        { label: "Último acesso",    value: (() => { try { return new Date(u.last_access).toLocaleDateString("pt-BR"); } catch { return u.last_access ?? "—"; } })() },
                        { label: "Aulas assistidas", value: u.videos_watched },
                        { label: "Horas de treino",  value: `${u.total_hours}h` },
                      ].map((d) => (
                        <div key={d.label} className="rounded-lg bg-secondary/50 p-2.5">
                          <p className="text-[10px] text-muted-foreground">{d.label}</p>
                          <p className="text-xs font-medium text-foreground">{d.value}</p>
                        </div>
                      ))}
                    </div>

                    {userPayments.length > 0 && (
                      <div className="border-t border-border p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Histórico de pagamentos
                        </p>
                        {userPayments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-1.5">
                            <div>
                              <span className="text-xs text-foreground">{p.date}</span>
                              <span className="ml-2 text-[10px] text-muted-foreground">{p.method}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">R$ {Number(p.amount).toFixed(2)}</span>
                              <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-semibold", getStatusColor(p.status))}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex border-t border-border">
                      <button
                        onClick={() => openModal("edit", u)}
                        className="flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => openModal("email", u)}
                        className="flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors"
                      >
                        <Mail size={12} /> Email
                      </button>
                      <button
                        onClick={() => openModal("plan", u)}
                        className="flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium text-primary border-r border-border hover:bg-primary/10 transition-colors"
                      >
                        <Shield size={12} /> Plano
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ userId: u.id, status: u.status === "ativo" ? "inativo" : "ativo" })}
                        className="flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <ShieldOff size={12} /> {u.status === "ativo" ? "Bloquear" : "Ativar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-10 text-center">
          <Search size={32} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum usuário encontrado</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
