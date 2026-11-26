// Venda avulsa de módulos (migration 022): o admin define o preço de cada
// módulo dos professores. Com preço, o aluno sem plano vê "Comprar este
// módulo" no site e ganha acesso vitalício às aulas dele.
import { useMemo, useState } from "react";
import { Loader2, ShoppingCart, Search } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import LoadError from "@/components/LoadError";
import { useAllModuleSales, useSetModulePrice, type ModuleSale } from "@/hooks/useModulePurchases";
import { cn } from "@/lib/utils";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "49,90" / "49.90" / "R$ 49,90" → 49.9; vazio → null; inválido → NaN. */
function parsePrice(text: string): number | null {
  const clean = text.replace(/[R$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : NaN;
}

function PriceRow({ mod }: { mod: ModuleSale }) {
  const setPrice = useSetModulePrice();
  const initial = mod.price != null ? mod.price.toFixed(2).replace(".", ",") : "";
  const [text, setText] = useState(initial);
  const dirty = text.trim() !== initial;

  function save(next: number | null) {
    setPrice.mutate({ id: mod.id, price: next }, {
      onSuccess: () => toast.success(next == null ? "Módulo fora da venda avulsa" : `Preço salvo: ${brl(next)}`),
      onError:   (e) => toast.error(`Erro ao salvar: ${(e as Error).message}`),
    });
  }

  function handleSave() {
    const value = parsePrice(text);
    if (Number.isNaN(value)) { toast.error("Preço inválido. Use, por exemplo, 49,90"); return; }
    save(value);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{mod.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{mod.instructorName} · {mod.lessons} aulas</p>
        </div>
        <span className={cn(
          "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
          mod.price != null ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
        )}>
          {mod.price != null ? "À venda" : "Só no plano"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && dirty) handleSave(); }}
            placeholder="Sem venda avulsa"
            aria-label={`Preço do módulo ${mod.title}`}
            className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || setPrice.isPending}
          className="rounded-full btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {setPrice.isPending ? <Loader2 size={13} className="animate-spin" /> : "Salvar"}
        </button>
        {mod.price != null && (
          <button
            onClick={() => { setText(""); save(null); }}
            disabled={setPrice.isPending}
            className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Tirar
          </button>
        )}
      </div>

      {mod.sales > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {mod.sales} {mod.sales === 1 ? "venda" : "vendas"} · {brl(mod.revenue)}
        </p>
      )}
    </div>
  );
}

const AdminModuleSales = () => {
  const { data: modules = [], isLoading, isError, refetch } = useAllModuleSales();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.title.toLowerCase().includes(q) || m.instructorName.toLowerCase().includes(q));
  }, [modules, query]);

  const totalSales   = modules.reduce((n, m) => n + m.sales, 0);
  const totalRevenue = modules.reduce((n, m) => n + m.revenue, 0);
  const onSale       = modules.filter((m) => m.price != null).length;

  return (
    <AdminLayout title="Venda de módulos" backTo="/admin">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Venda de módulos</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShoppingCart size={13} /> {onSale} à venda
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Defina um preço para vender o módulo avulso: quem não tem plano compra só aquele módulo e
        tem acesso para sempre, inclusive às aulas que entrarem nele depois. Sem preço, o módulo
        continua só para quem tem plano. A compra aparece no site; no app das lojas ainda não.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendas</p>
          <p className="text-lg font-bold text-foreground">{totalSales}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturado</p>
          <p className="text-lg font-bold text-foreground">{brl(totalRevenue)}</p>
        </div>
      </div>

      <div className="relative mt-4">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar módulo ou professor"
          className="w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="mt-8"><LoadError onRetry={() => refetch()} /></div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          {modules.length === 0 ? "Nenhum módulo criado pelos professores ainda" : "Nada encontrado"}
        </p>
      ) : (
        <div className="mt-4 space-y-2 pb-6">
          {filtered.map((m) => <PriceRow key={m.id} mod={m} />)}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminModuleSales;
