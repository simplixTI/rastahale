import { Users, DollarSign, Video, AlertCircle, TrendingUp, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { useAdminDashboard, useAdminPayments, useAdminUsers } from "@/hooks/useAdminData";
import { getStatusColor } from "@/data/mockData";
import { cn } from "@/lib/utils";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: kpis } = useAdminDashboard();
  const { data: payments = [] } = useAdminPayments();
  const { data: users = [] } = useAdminUsers();

  const recentPayments = payments.slice(0, 4);
  const topUsers = [...users].sort((a, b) => (b.total_hours ?? 0) - (a.total_hours ?? 0)).slice(0, 3);

  const cards = [
    { label: "Usuários ativos",  value: kpis?.activeUsers ?? "—",                         icon: Users,       color: "text-emerald-400", path: "/admin/usuarios"  },
    { label: "Receita total",    value: kpis ? `R$ ${kpis.revenue.toFixed(2)}` : "—",      icon: DollarSign,  color: "text-primary",     path: "/admin/pagamentos" },
    { label: "Total de vídeos",  value: kpis?.totalVideos ?? "—",                          icon: Video,       color: "text-blue-400",    path: "/admin/videos"    },
    { label: "Pendentes",        value: kpis?.pendingPayments ?? "—",                      icon: AlertCircle, color: "text-amber-400",   path: "/admin/pagamentos" },
  ];

  return (
    <AdminLayout title="Painel Admin">
      <h2 className="text-lg font-bold text-foreground">Visão Geral</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.path)}
            className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
          >
            <c.icon size={20} className={c.color} />
            <p className="mt-2 text-xl font-bold text-foreground">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate("/admin/videos")}
          className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs font-medium text-primary"
        >
          <Video size={16} /> Gerenciar Vídeos
        </button>
        <button
          onClick={() => navigate("/admin/planos")}
          className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs font-medium text-primary"
        >
          <DollarSign size={16} /> Gerenciar Planos
        </button>
        <button
          onClick={() => navigate("/admin/loja")}
          className="col-span-2 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs font-medium text-primary"
        >
          <ShoppingBag size={16} /> Banner da Loja (carrossel da Home)
        </button>
      </div>

      <h3 className="mt-6 text-sm font-bold text-foreground">Últimos pagamentos</h3>
      <div className="mt-2 space-y-2">
        {recentPayments.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div>
              <p className="text-xs font-medium text-foreground">{p.user_name}</p>
              <p className="text-[10px] text-muted-foreground">{p.date} · {p.method}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">R$ {Number(p.amount).toFixed(2)}</p>
              <span className={cn("inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold", getStatusColor(p.status))}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-bold text-foreground">Top Alunos</h3>
      <div className="mt-2 space-y-2">
        {topUsers.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <img
              src={u.avatar_url || "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=40&h=40&fit=crop"}
              alt={u.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{u.name}</p>
              <p className="text-[10px] text-muted-foreground">{u.videos_watched} aulas · {u.total_hours}h</p>
            </div>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
