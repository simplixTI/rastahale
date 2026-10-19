import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import {
  useModules, useCreateModule, useUpdateModule, useDeleteModule, type Module,
} from "@/hooks/useModules";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

/**
 * Categoria = nome de módulo. A tabela pode ter o mesmo nome em mais de uma
 * modalidade interna (ex: "Fundamentos" de jiu-jitsu e de luta-livre); na tela
 * vira uma categoria só, e renomear/remover vale para todos os registros dela.
 */
interface Category { name: string; ids: string[] }

function groupByName(modules: Module[]): Category[] {
  const map = new Map<string, string[]>();
  for (const m of modules) map.set(m.name, [...(map.get(m.name) ?? []), m.id]);
  return Array.from(map, ([name, ids]) => ({ name, ids }));
}

// ── linha de categoria (rename inline) ─────────────────────────────────────────

function CategoryRow({ category, onDelete }: { category: Category; onDelete: () => void }) {
  const updateModule          = useUpdateModule();
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(category.name);

  function save() {
    const name = value.trim();
    if (name.length < 2) { toast.error("Nome muito curto"); return; }
    if (name === category.name) { setEditing(false); return; }
    updateModule.mutate({ ids: category.ids, oldName: category.name, name }, {
      onSuccess: () => { toast.success("Categoria renomeada"); setEditing(false); },
      onError:   () => toast.error("Erro ao renomear"),
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
      {editing ? (
        <>
          <input value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setValue(category.name); } }}
            autoFocus className={cn(fieldCls, "flex-1 py-1.5")} />
          <button onClick={save} disabled={updateModule.isPending} className="text-emerald-400 disabled:opacity-50">
            {updateModule.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
          <button onClick={() => { setEditing(false); setValue(category.name); }} className="text-muted-foreground"><X size={15} /></button>
        </>
      ) : (
        <>
          <span className="flex-1 text-xs font-medium text-foreground">{category.name}</span>
          <button onClick={() => { setEditing(true); setValue(category.name); }} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil size={13} /></button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={13} /></button>
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

  const [newName,   setNewName]   = useState("");
  const [toDelete,  setToDelete]  = useState<Category | null>(null);

  const categories = groupByName(modules);

  function handleAdd() {
    const name = newName.trim();
    if (name.length < 2) { toast.error("Informe um nome"); return; }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast.error("Já existe uma categoria com esse nome"); return; }
    createModule.mutate({ name }, {
      onSuccess: () => { toast.success("Categoria adicionada"); setNewName(""); },
      onError:   () => toast.error("Erro ao adicionar categoria"),
    });
  }

  function handleDelete() {
    if (!toDelete) return;
    deleteModule.mutate({ ids: toDelete.ids }, {
      onSuccess: () => { toast.success("Categoria removida"); setToDelete(null); },
      onError:   () => toast.error("Erro ao remover categoria"),
    });
  }

  return (
    <AdminLayout title="Categorias" backTo="/admin/videos">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Categorias</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Layers size={13} /> {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Organize as aulas em categorias — ex: Wrestling, Passagem de Guarda, Finalizações.
        Cada categoria vira uma seção na Home e aparece no cadastro de aulas, nos planos e na busca.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Nova categoria…" className={fieldCls} />
        <button onClick={handleAdd} disabled={createModule.isPending}
          className="flex shrink-0 items-center gap-1 rounded-full btn-press bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
          {createModule.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : categories.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <Layers size={30} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma categoria ainda — adicione a primeira acima</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {categories.map((c) => (
            <CategoryRow key={c.name} category={c} onDelete={() => setToDelete(c)} />
          ))}
        </div>
      )}

      {/* confirmar remoção */}
      {toDelete && (
        <Dialog open onOpenChange={(v) => { if (!v) setToDelete(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Remover categoria?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">
              A categoria <span className="font-semibold text-foreground">{toDelete.name}</span> será removida.
              As aulas já cadastradas nela não são afetadas, mas ela deixa de aparecer no seletor.
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setToDelete(null)} className="rounded-full btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteModule.isPending} className="rounded-full btn-press bg-red-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Remover</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default AdminModules;
