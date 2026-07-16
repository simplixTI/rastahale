import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import {
  useModules, useCreateModule, useUpdateModule, useDeleteModule,
  type Modality, type Module,
} from "@/hooks/useModules";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const MODALITIES: { value: Modality; label: string }[] = [
  { value: "jiu-jitsu",  label: "Jiu Jitsu" },
  { value: "luta-livre", label: "Luta Livre" },
];

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── card de módulo (com rename inline) ─────────────────────────────────────────

function ModuleRow({ module, onDelete }: { module: Module; onDelete: () => void }) {
  const updateModule            = useUpdateModule();
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(module.name);

  function save() {
    const name = value.trim();
    if (name.length < 2) { toast.error("Nome muito curto"); return; }
    if (name === module.name) { setEditing(false); return; }
    updateModule.mutate({ id: module.id, name }, {
      onSuccess: () => { toast.success("Módulo renomeado"); setEditing(false); },
      onError:   () => toast.error("Erro ao renomear"),
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setValue(module.name); } }}
            autoFocus
            className={cn(fieldCls, "flex-1 py-1.5")}
          />
          <button onClick={save} disabled={updateModule.isPending} className="text-emerald-400 disabled:opacity-50">
            {updateModule.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
          <button onClick={() => { setEditing(false); setValue(module.name); }} className="text-muted-foreground">
            <X size={15} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-xs font-medium text-foreground">{module.name}</span>
          <button onClick={() => { setEditing(true); setValue(module.name); }}
            className="text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors">
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}

// ── página ─────────────────────────────────────────────────────────────────────

const AdminModules = () => {
  const { data: modules = [], isLoading } = useModules();
  const createModule                      = useCreateModule();
  const deleteModule                      = useDeleteModule();

  const [modality, setModality] = useState<Modality>("jiu-jitsu");
  const [newName,  setNewName]  = useState("");
  const [deleting, setDeleting] = useState<Module | null>(null);

  const current = modules.filter((m) => m.category === modality);

  function handleAdd() {
    const name = newName.trim();
    if (name.length < 2) { toast.error("Informe um nome"); return; }
    if (current.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Já existe um módulo com esse nome"); return;
    }
    createModule.mutate({ name, category: modality }, {
      onSuccess: () => { toast.success("Módulo adicionado"); setNewName(""); },
      onError:   () => toast.error("Erro ao adicionar módulo"),
    });
  }

  function handleDelete() {
    if (!deleting) return;
    deleteModule.mutate({ id: deleting.id }, {
      onSuccess: () => { toast.success("Módulo removido"); setDeleting(null); },
      onError:   () => toast.error("Erro ao remover módulo"),
    });
  }

  return (
    <AdminLayout title="Módulos">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Módulos</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Layers size={13} /> {modules.length} no total
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Organize as aulas em módulos por modalidade. Eles aparecem no cadastro de aulas e nos planos.
      </p>

      {/* toggle de modalidade */}
      <div className="mt-3 flex rounded-xl border border-border overflow-hidden">
        {MODALITIES.map((m) => (
          <button key={m.value} onClick={() => setModality(m.value)}
            className={cn("flex-1 py-2.5 text-xs font-semibold transition-colors",
              modality === m.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>
            {m.label}
          </button>
        ))}
      </div>

      {/* adicionar */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder={`Novo módulo de ${MODALITIES.find((m) => m.value === modality)?.label}…`}
          className={fieldCls}
        />
        <button onClick={handleAdd} disabled={createModule.isPending}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
          {createModule.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar
        </button>
      </div>

      {/* lista */}
      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : current.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Layers size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum módulo nesta modalidade</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {current.map((m) => (
            <ModuleRow key={m.id} module={m} onDelete={() => setDeleting(m)} />
          ))}
        </div>
      )}

      {/* confirmar remoção */}
      {deleting && (
        <Dialog open onOpenChange={(v) => { if (!v) setDeleting(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground">Remover módulo?</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              O módulo <span className="font-semibold text-foreground">{deleting.name}</span> será removido.
              As aulas já cadastradas nele não são afetadas, mas ele deixa de aparecer no seletor.
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteModule.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Remover</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default AdminModules;
