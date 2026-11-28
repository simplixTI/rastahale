import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock, CreditCard, EyeOff, Flame,
  GraduationCap, ImageOff, Plus, UserPlus, Users, Video,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminLayout from "@/components/AdminLayout";
import AvatarImage from "@/components/AvatarImage";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminInstructors, useAdminPayments, useAdminUsers, useAdminVideos } from "@/hooks/useAdminData";
import { cn } from "@/lib/utils";

// Painel do admin: o que precisa de ação primeiro, depois como o negócio está
// (alunos, receita, catálogo) e, por fim, as listas do dia a dia.

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const parseDate = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`) : null);

const STATUS = {
  ativo:    { label: "Ativos",    bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  pendente: { label: "Pendentes", bar: "bg-amber-400",   text: "text-amber-700 dark:text-amber-400" },
  inativo:  { label: "Inativos",  bar: "bg-red-400",     text: "text-red-700 dark:text-red-400" },
} as const;

const PAY_STATUS: Record<string, string> = {
  pago: "text-emerald-700 dark:text-emerald-400",
  pendente: "text-amber-700 dark:text-amber-400",
  falhou: "text-red-700 dark:text-red-400",
};

function Panel({ title, action, children, className }: {
  title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 lg:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="flex items-center gap-1 rounded-md text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label} <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">{children}</p>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: users = [], isLoading: loadingUsers } = useAdminUsers();
  const { data: payments = [] } = useAdminPayments();
  const { data: videos = [] } = useAdminVideos();
  const { data: instructors = [] } = useAdminInstructors();

  const today = new Date();
  const firstName = (user?.name ?? "").split(" ")[0];
  const hour = today.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const data = useMemo(() => {
    const students = users.filter((u) => u.role !== "admin" && u.role !== ("instructor" as string));
    const byStatus = {
      ativo: students.filter((u) => u.status === "ativo").length,
      pendente: students.filter((u) => u.status === "pendente").length,
      inativo: students.filter((u) => u.status === "inativo").length,
    };

    const plans = Object.entries(
      students.filter((u) => u.status === "ativo").reduce<Record<string, number>>((acc, u) => {
        acc[u.plan_name] = (acc[u.plan_name] ?? 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    // Receita paga nos últimos 6 meses, mês a mês.
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
      return { key: monthKey(d), label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), total: 0 };
    });
    payments.filter((p) => p.status === "pago").forEach((p) => {
      const d = parseDate(p.date);
      const m = d && months.find((x) => x.key === monthKey(d));
      if (m) m.total += Number(p.amount);
    });
    const thisMonth = months[5].total;
    const lastMonth = months[4].total;

    // Do mês: o que veio do Stripe e o que foi ativação avulsa (Pix,
    // maquininha... lançado em Ativação manual).
    const paidThisMonth = payments.filter((p) => {
      const d = parseDate(p.date);
      return p.status === "pago" && d && monthKey(d) === monthKey(today);
    });
    const isManual = (p: { method: string }) => p.method !== "Stripe";
    const monthStripe = paidThisMonth.filter((p) => !isManual(p)).reduce((s, p) => s + Number(p.amount), 0);
    const monthManualList = paidThisMonth.filter(isManual);
    const monthManual = monthManualList.reduce((s, p) => s + Number(p.amount), 0);
    const totalRevenue = payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);

    const newThisMonth = students.filter((u) => {
      const d = parseDate(u.join_date);
      return d && monthKey(d) === monthKey(today);
    }).length;

    const hidden = videos.filter((v) => v.visible === false).length;

    return {
      students, byStatus, plans, months, thisMonth, lastMonth, newThisMonth, hidden,
      monthStripe, monthManual, monthManualCount: monthManualList.length, totalRevenue,
      pendingPayments: payments.filter((p) => p.status === "pendente").length,
      noPhoto: instructors.filter((i) => !i.avatar).length,
      withStudio: instructors.filter((i) => i.hasLogin).length,
      topStudents: [...students].sort((a, b) => b.total_hours - a.total_hours).filter((u) => u.total_hours > 0).slice(0, 5),
      newest: students.slice(0, 5),
      recentPayments: payments.slice(0, 5),
      lessonsByInstructor: instructors
        .map((i) => ({ ...i, count: videos.filter((v) => v.instructorId === i.id).length }))
        .sort((a, b) => b.count - a.count),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, payments, videos, instructors]);

  // O que pede ação agora, do mais grave para o menos grave.
  const alerts = [
    videos.length === 0 && {
      icon: Video, tone: "danger" as const,
      text: "O catálogo está vazio: os alunos não têm nenhuma aula para assistir.",
      action: "Enviar aulas", to: "/admin/videos",
    },
    data.byStatus.pendente > 0 && {
      icon: UserPlus, tone: "warn" as const,
      text: `${data.byStatus.pendente} ${data.byStatus.pendente === 1 ? "aluno cadastrado ainda não assinou" : "alunos cadastrados ainda não assinaram"}.`,
      action: "Ver alunos", to: "/admin/usuarios",
    },
    data.pendingPayments > 0 && {
      icon: CreditCard, tone: "warn" as const,
      text: `${data.pendingPayments} ${data.pendingPayments === 1 ? "pagamento pendente" : "pagamentos pendentes"}.`,
      action: "Pagamentos", to: "/admin/pagamentos",
    },
    data.hidden > 0 && {
      icon: EyeOff, tone: "info" as const,
      text: `${data.hidden} ${data.hidden === 1 ? "aula está oculta" : "aulas estão ocultas"} para os alunos.`,
      action: "Ver aulas", to: "/admin/videos",
    },
    data.noPhoto > 0 && {
      icon: ImageOff, tone: "info" as const,
      text: `${data.noPhoto} ${data.noPhoto === 1 ? "professor está" : "professores estão"} sem foto no perfil.`,
      action: "Instrutores", to: "/admin/instrutores",
    },
  ].filter(Boolean) as { icon: typeof Video; tone: "danger" | "warn" | "info"; text: string; action: string; to: string }[];

  const totalStudents = data.students.length;
  const revenueDelta = data.lastMonth > 0 ? Math.round(((data.thisMonth - data.lastMonth) / data.lastMonth) * 100) : null;
  const hasRevenue = data.months.some((m) => m.total > 0);
  const maxLessons = Math.max(1, ...data.lessonsByInstructor.map((i) => i.count));

  return (
    <AdminLayout title="Painel" width="wide">
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/instrutores")}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <GraduationCap size={15} aria-hidden="true" /> Professores
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/videos")}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={15} aria-hidden="true" /> Enviar aula
          </button>
        </div>
      </header>

      {/* ── Precisa de atenção ────────────────────────────────────────── */}
      <section aria-label="Precisa de atenção" className="mt-5">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
            <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-sm text-foreground">Tudo em ordem. Nada pede sua atenção agora.</p>
          </div>
        ) : (
          <ul className="stagger overflow-hidden rounded-2xl border border-border bg-card">
            {alerts.map(({ icon: Icon, tone, text, action, to }, i) => (
              <li key={text} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border")}>
                <span
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                    tone === "danger" && "bg-red-500/10 text-red-600 dark:text-red-400",
                    tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    tone === "info" && "bg-secondary text-muted-foreground"
                  )}
                >
                  {tone === "danger" ? <AlertTriangle size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                </span>
                <p className="min-w-0 flex-1 text-sm text-foreground">{text}</p>
                <button
                  type="button"
                  onClick={() => navigate(to)}
                  className="flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  {action} <ArrowRight size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Números ───────────────────────────────────────────────────── */}
      <div className="stagger mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => navigate("/admin/usuarios")} className="rounded-2xl border border-border bg-card p-4 text-left">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Users size={14} aria-hidden="true" /> Alunos ativos</p>
          <p className="tabular mt-2 text-3xl font-bold tracking-tight text-foreground">
            {loadingUsers ? "—" : data.byStatus.ativo}
            <span className="ml-1 text-sm font-medium text-muted-foreground">de {totalStudents}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            <div className="belt-fill h-full rounded-full bg-emerald-500" style={{ width: `${totalStudents ? (data.byStatus.ativo / totalStudents) * 100 : 0}%` }} />
          </div>
        </button>

        <button type="button" onClick={() => navigate("/admin/pagamentos")} className="rounded-2xl border border-border bg-card p-4 text-left">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><CreditCard size={14} aria-hidden="true" /> Receita do mês</p>
          <p className="tabular mt-2 text-3xl font-bold tracking-tight text-foreground">{brl(data.thisMonth)}</p>
          <p className="tabular mt-2 text-xs text-muted-foreground">
            Stripe {brl(data.monthStripe)} · Avulso {brl(data.monthManual)}
            {data.monthManualCount > 0 && ` (${data.monthManualCount})`}
          </p>
          <p className="tabular mt-1 text-xs text-muted-foreground">Total desde o início: {brl(data.totalRevenue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {revenueDelta === null
              ? `Mês passado: ${brl(data.lastMonth)}`
              : <><span className={revenueDelta >= 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : "font-semibold text-red-700 dark:text-red-400"}>{revenueDelta >= 0 ? "+" : ""}{revenueDelta}%</span> sobre o mês passado</>}
          </p>
        </button>

        <button type="button" onClick={() => navigate("/admin/videos")} className="rounded-2xl border border-border bg-card p-4 text-left">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BookOpen size={14} aria-hidden="true" /> Aulas no catálogo</p>
          <p className="tabular mt-2 text-3xl font-bold tracking-tight text-foreground">{videos.length}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {videos.length === 0 ? "Nenhuma aula enviada" : data.hidden > 0 ? `${videos.length - data.hidden} visíveis · ${data.hidden} ocultas` : "Todas visíveis para os alunos"}
          </p>
        </button>

        <button type="button" onClick={() => navigate("/admin/usuarios")} className="rounded-2xl border border-border bg-card p-4 text-left">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><UserPlus size={14} aria-hidden="true" /> Novos no mês</p>
          <p className="tabular mt-2 text-3xl font-bold tracking-tight text-foreground">{data.newThisMonth}</p>
          <p className="mt-2 text-xs text-muted-foreground">cadastros em {today.toLocaleDateString("pt-BR", { month: "long" })}</p>
        </button>
      </div>

      {/* ── Receita e alunos ──────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <Panel title="Receita dos últimos 6 meses" action={{ label: "Pagamentos", onClick: () => navigate("/admin/pagamentos") }}>
          {hasRevenue ? (
            <div className="h-48" role="img" aria-label={`Receita paga por mês: ${data.months.map((m) => `${m.label} ${brl(m.total)}`).join(", ")}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--secondary))" }}
                    formatter={(v: number) => [brl(v), "Receita"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {data.months.map((m, i) => (
                      <Cell key={m.key} fill={i === data.months.length - 1 ? "hsl(var(--brand-yellow))" : "hsl(var(--foreground) / 0.18)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty>Ainda não há pagamentos confirmados. Quando as vendas entrarem, a receita de cada mês aparece aqui.</Empty>
          )}
        </Panel>

        <Panel title="Alunos" action={{ label: "Gerenciar", onClick: () => navigate("/admin/usuarios") }}>
          {totalStudents === 0 ? (
            <Empty>Nenhum aluno cadastrado ainda.</Empty>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) =>
                  data.byStatus[k] > 0 ? (
                    <div key={k} className={cn("belt-fill h-full", STATUS[k].bar)} style={{ width: `${(data.byStatus[k] / totalStudents) * 100}%` }} />
                  ) : null
                )}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => (
                  <div key={k}>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("h-2 w-2 rounded-full", STATUS[k].bar)} aria-hidden="true" /> {STATUS[k].label}
                    </dt>
                    <dd className="tabular text-lg font-bold text-foreground">{data.byStatus[k]}</dd>
                  </div>
                ))}
              </dl>

              <h3 className="mt-4 text-xs font-semibold text-muted-foreground">Planos dos alunos ativos</h3>
              {data.plans.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nenhum aluno ativo.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.plans.map(([plan, n]) => (
                    <li key={plan} className="flex items-center gap-3 text-sm">
                      <span className="w-28 truncate text-foreground">{plan}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                        <span className="belt-fill block h-full rounded-full bg-foreground/70" style={{ width: `${(n / data.byStatus.ativo) * 100}%` }} />
                      </span>
                      <span className="tabular w-6 text-right font-semibold text-foreground">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>
      </div>

      {/* ── Listas ────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start xl:grid-cols-3">
        <Panel title="Últimos pagamentos" action={{ label: "Ver todos", onClick: () => navigate("/admin/pagamentos") }}>
          {data.recentPayments.length === 0 ? (
            <Empty>Nenhum pagamento registrado ainda. As vendas aparecem aqui assim que entram.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {parseDate(p.date)?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {p.method === "Stripe" ? "Stripe" : `Avulso (${p.method})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold text-foreground">{brl(Number(p.amount))}</p>
                    <p className={cn("text-xs font-medium capitalize", PAY_STATUS[p.status] ?? "text-muted-foreground")}>{p.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Mais engajados" action={{ label: "Ranking", onClick: () => navigate("/admin/temporada") }}>
          {data.topStudents.length === 0 ? (
            <Empty>Ninguém assistiu aulas ainda. Os alunos que mais treinam aparecem aqui.</Empty>
          ) : (
            <ol className="space-y-2.5">
              {data.topStudents.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className={cn("tabular w-4 text-center text-sm font-bold", i === 0 ? "text-foreground" : "text-muted-foreground")}>{i + 1}</span>
                  <AvatarImage src={u.avatar_url} name={u.name} className="h-8 w-8 flex-shrink-0 rounded-full text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.videos_watched} {u.videos_watched === 1 ? "aula" : "aulas"}</p>
                  </div>
                  <span className="tabular flex items-center gap-1 text-sm font-semibold text-foreground">
                    {i === 0 && <Flame size={14} className="text-[hsl(var(--brand-red))]" aria-hidden="true" />}
                    {u.total_hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Aulas por professor" action={{ label: "Instrutores", onClick: () => navigate("/admin/instrutores") }} className="lg:col-span-2 xl:col-span-1">
          {data.lessonsByInstructor.length === 0 ? (
            <Empty>Nenhum professor cadastrado.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {data.lessonsByInstructor.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/instrutores/${i.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg text-left"
                  >
                    <AvatarImage src={i.avatar} name={i.name} className="h-8 w-8 flex-shrink-0 rounded-full text-[11px]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{i.name}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                        <span className="belt-fill block h-full rounded-full bg-foreground/70" style={{ width: `${(i.count / maxLessons) * 100}%` }} />
                      </span>
                    </span>
                    <span className="tabular w-16 text-right text-xs text-muted-foreground">{i.count} {i.count === 1 ? "aula" : "aulas"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={12} aria-hidden="true" /> {data.withStudio} de {instructors.length} com acesso ao Studio
          </p>
        </Panel>
      </div>

      {/* Novos cadastros, discretos no rodapé */}
      {data.newest.length > 0 && (
        <Panel title="Cadastros recentes" action={{ label: "Ver alunos", onClick: () => navigate("/admin/usuarios") }} className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {data.newest.map((u) => (
              <li key={u.id} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
                <AvatarImage src={u.avatar_url} name={u.name} className="h-6 w-6 rounded-full text-[10px]" />
                <span className="text-sm text-foreground">{u.name}</span>
                <span className={cn("text-xs font-medium", STATUS[u.status]?.text)}>· {u.status}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
