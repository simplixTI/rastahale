import { useState } from "react";
import { Eye, EyeOff, Edit2, Plus, CheckCircle, Users, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPlans, useTogglePlanActive, useCreatePlan, useUpdatePlan } from "@/hooks/useAdminData";
import { videoCategories } from "@/data/mockData";
import { cn } from "@/lib/utils";
import PlanFormModal from "@/components/PlanFormModal";

type PlanRow = ReturnType<typeof useAdminPlans>["data"] extends (infer P)[] ? P : never;

const AdminPlans = () => {
  const { data: plans = [], isLoading } = useAdminPlans();
  const toggleActive = useTogglePlanActive();
  const createPlan   = useCreatePlan();
  const updatePlan   = useUpdatePlan();

  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingPlan,  setEditingPlan]  = useState<PlanRow | null>(null);

  const totalSubscribers = plans.reduce((s, p) => s + (p.users_count ?? 0), 0);
  const monthlyRevenue   = plans.reduce((s, p) => {
    if (!p.active) return s;
    const monthly = p.interval === "anual" ? p.price / 12 : p.interval === "trimestral" ? p.price / 3 : p.price;
    return s + monthly * (p.users_count ?? 0);
  }, 0);

  return (
    <AdminLayout title="Planos">
      {/* Modal: Criar */}
      <PlanFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={(data) =>
          createPlan.mutate(
            { name: data.name, price: data.price, interval: data.interval, max_level: data.maxLevel, categories: data.categories, features: data.features, active: data.active },
            { onSuccess: () => { toast.success("Plano criado"); setShowCreate(false); }, onError: () => toast.error("Erro ao criar plano") }
          )
        }
        isPending={createPlan.isPending}
      />

      {/* Modal: Editar */}
      <PlanFormModal
        open={!!editingPlan}
        onOpenChange={(v) => { if (!v) setEditingPlan(null); }}
        plan={editingPlan}
        onSubmit={(data) => {
          if (!editingPlan) return;
          updatePlan.mutate(
            { id: editingPlan.id, name: data.name, price: data.price, interval: data.interval, max_level: data.maxLevel, categories: data.categories, features: data.features, active: data.active },
            { onSuccess: () => { toast.success("Plano atualizado"); setEditingPlan(null); }, onError: () => toast.error("Erro ao atualizar plano") }
          );
        }}
        isPending={updatePlan.isPending}
      />

      <h2 className="text-lg font-bold text-foreground">Gerenciar Planos</h2>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <Users size={18} className="mx-auto text-primary" />
          <p className="mt-1 text-xl font-bold text-foreground">{totalSubscribers}</p>
          <p className="text-[10px] text-muted-foreground">Total assinantes</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <Crown size={18} className="mx-auto text-amber-400" />
          <p className="mt-1 text-xl font-bold text-foreground">R$ {monthlyRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Receita mensal est.</p>
        </div>
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground"
      >
        <Plus size={14} /> Criar Novo Plano
      </button>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {plans.map((p) => {
            const isExpanded = expandedPlan === p.id;
            const levelOrder = { Iniciante: 1, Intermediário: 2, Avançado: 3 } as Record<string, number>;

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border bg-card overflow-hidden transition-all",
                  p.active ? "border-primary/30" : "border-border opacity-60"
                )}
              >
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : p.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                      {!p.active && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold text-red-400">Inativo</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.users_count ?? 0} assinantes · {p.interval}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">R$ {Number(p.price).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">/{p.interval}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recursos incluídos</p>
                      <ul className="space-y-1.5">
                        {(p.features ?? []).map((f: string) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                            <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-border p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Categorias liberadas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {videoCategories.map((cat) => {
                          const included = (p.categories ?? []).includes(cat);
                          return (
                            <span
                              key={cat}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[10px] font-medium",
                                included ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground line-through"
                              )}
                            >
                              {cat}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-border p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Nível máximo</p>
                      <div className="flex gap-2">
                        {["Iniciante", "Intermediário", "Avançado"].map((lvl) => {
                          const maxOrder  = levelOrder[p.max_level] ?? 1;
                          const thisOrder = levelOrder[lvl] ?? 1;
                          const included  = thisOrder <= maxOrder;
                          return (
                            <span
                              key={lvl}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[10px] font-medium",
                                included
                                  ? lvl === "Iniciante"    ? "bg-emerald-500/20 text-emerald-400"
                                  : lvl === "Intermediário" ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                                  : "bg-secondary text-muted-foreground line-through"
                              )}
                            >
                              {lvl}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex border-t border-border">
                      <button
                        onClick={() => toggleActive.mutate({ planId: p.id, active: !p.active })}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium border-r border-border hover:bg-secondary/50 transition-colors",
                          p.active ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        {p.active ? "Ativo" : "Inativo"}
                      </button>
                      <button
                        onClick={() => setEditingPlan(p)}
                        className="flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                      >
                        <Edit2 size={14} /> Editar Plano
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPlans;
