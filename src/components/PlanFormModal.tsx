import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { videoCategories } from "@/data/mockData";
import { useModules, moduleNames } from "@/hooks/useModules";
import { cn } from "@/lib/utils";

const schema = z.object({
  name:     z.string().min(2, "Mínimo 2 caracteres"),
  price:    z.coerce.number().min(0, "Preço inválido"),
  interval: z.enum(["mensal", "trimestral", "anual"]),
  maxLevel: z.enum(["Iniciante", "Intermediário", "Avançado"]),
  active:   z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface PlanFormData extends FormValues {
  categories: string[];
  features:   string[];
}

interface PlanRow {
  id:          string;
  name:        string;
  price:       number;
  interval:    "mensal" | "trimestral" | "anual";
  max_level:   "Iniciante" | "Intermediário" | "Avançado";
  categories:  string[];
  features:    string[];
  active:      boolean;
  users_count: number;
}

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  plan?:        PlanRow | null;
  onSubmit:     (data: PlanFormData) => void;
  isPending?:   boolean;
}

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

export default function PlanFormModal({ open, onOpenChange, plan, onSubmit, isPending }: Props) {
  const isEdit = !!plan;

  const { data: modules = [] } = useModules();
  // Módulos disponíveis (nomes únicos das duas modalidades); fallback à lista fixa.
  const planCategories = (() => {
    const names = moduleNames(modules);
    return names.length ? names : [...videoCategories];
  })();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", price: 0, interval: "mensal", maxLevel: "Iniciante", active: true },
  });

  const [categories,  setCategories]  = useState<string[]>([]);
  const [features,    setFeatures]    = useState<string[]>([]);
  const [newFeature,  setNewFeature]  = useState("");
  const [catError,    setCatError]    = useState("");

  useEffect(() => {
    if (!open) return;
    if (plan) {
      reset({
        name:     plan.name,
        price:    plan.price,
        interval: plan.interval,
        maxLevel: plan.max_level,
        active:   plan.active,
      });
      setCategories([...plan.categories]);
      setFeatures([...plan.features]);
    } else {
      reset({ name: "", price: 0, interval: "mensal", maxLevel: "Iniciante", active: true });
      setCategories([]);
      setFeatures([]);
    }
    setNewFeature("");
    setCatError("");
  }, [open, plan, reset]);

  const toggleCategory = (cat: string) =>
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setFeatures((prev) => [...prev, trimmed]);
    setNewFeature("");
  };

  const removeFeature = (idx: number) =>
    setFeatures((prev) => prev.filter((_, i) => i !== idx));

  const handleFormSubmit = (values: FormValues) => {
    if (categories.length === 0) { setCatError("Selecione ao menos uma categoria"); return; }
    setCatError("");
    onSubmit({ ...values, categories, features });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">
            {isEdit ? "Editar Plano" : "Criar Novo Plano"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          {/* Nome e Preço */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Nome do plano</label>
              <input {...register("name")} className={fieldCls} placeholder="Ex: Premium" />
              {errors.name && <p className="mt-0.5 text-[10px] text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Preço (R$)</label>
              <input type="number" step="0.01" {...register("price")} className={fieldCls} placeholder="79.90" />
              {errors.price && <p className="mt-0.5 text-[10px] text-red-400">{errors.price.message}</p>}
            </div>
          </div>

          {/* Intervalo e Nível máximo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Intervalo</label>
              <select {...register("interval")} className={fieldCls}>
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Nível máximo</label>
              <select {...register("maxLevel")} className={fieldCls}>
                <option>Iniciante</option>
                <option>Intermediário</option>
                <option>Avançado</option>
              </select>
            </div>
          </div>

          {/* Categorias liberadas */}
          <div>
            <label className={labelCls}>Categorias liberadas</label>
            <div className="flex flex-wrap gap-1.5">
              {planCategories.map((cat) => {
                const active = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            {catError && <p className="mt-1 text-[10px] text-red-400">{catError}</p>}
          </div>

          {/* Recursos incluídos */}
          <div>
            <label className={labelCls}>Recursos incluídos</label>
            <div className="flex gap-2">
              <input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                className={cn(fieldCls, "flex-1")}
                placeholder="Ex: Acesso total ao catálogo"
              />
              <button
                type="button"
                onClick={addFeature}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                <Plus size={13} />
              </button>
            </div>
            {features.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {features.map((f, idx) => (
                  <li key={idx} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                    <span className="text-xs text-foreground">{f}</span>
                    <button type="button" onClick={() => removeFeature(idx)} className="text-muted-foreground hover:text-red-400">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ativo */}
          <label className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 cursor-pointer">
            <span className="text-xs text-foreground">Plano ativo (visível para alunos)</span>
            <input type="checkbox" {...register("active")} className="accent-primary h-4 w-4" />
          </label>

          <DialogFooter className="pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar Plano"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
