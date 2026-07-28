import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import {
  useModules, useCreateModule, useUpdateModule, useDeleteModule, type Module,
} from "@/hooks/useModules";
import {
  useModalities, useCreateModality, useUpdateModality, useDeleteModality, type Modality,
} from "@/hooks/useModalities";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── card de módulo (rename inline) ─────────────────────────────────────────────

function ModuleRow({ module, onDelete }: { module: Module; onDelete: () => void }) {
  const updateModule          = useUpdateModule();
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(module.name);

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
          <input value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setValue(module.name); } }}
            autoFocus className={cn(fieldCls, "flex-1 py-1.5")} />
          <button onClick={save} disabled={updateModule.isPending} className="text-emerald-400 disabled:opacity-50">
            {updateModule.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
          <button onClick={() => { setEditing(false); setValue(module.name); }} className="text-muted-foreground"><X size={15} /></button>
        </>
      ) : (
        <>
          <span className="flex-1 text-xs font-medium text-foreground">{module.name}</span>
          <button onClick={() => { setEditing(true); setValue(module.name); }} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil size={13} /></button>
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={13} /></button>
        </>
      )}
    </div>
  );
}

// ── página ─────────────────────────────────────────────────────────────────────

const AdminModules = () => {
  const { data: modalities = [] }         = useModalities();
  const { data: modules = [], isLoading } = useModules();
  const createModality                    = useCreateModality();
  const updateModality                    = useUpdateModality();
  const deleteModality                    = useDeleteModality();
  const createModule                      = useCreateModule();
  const deleteModule                      = useDeleteModule();

  const [selected,  setSelected]  = useState<string | null>(null);
  const [newMod,    setNewMod]    = useState("");           // nome de novo módulo
  const [addModal,  setAddModal]  = useState(false);        // form de nova modalidade aberto?
  const [newModal,  setNewModal]  = useState("");           // nome de nova modalidade
  const [renaming,  setRenaming]  = useState(false);        // renomeando modalidade?
  const [renameVal, setRenameVal] = useState("");
  const [delModule, setDelModule] = useState<Module | null>(null);
  const [delModal,  setDelModal]  = useState<Modality | null>(null);

  // Modalidade ativa: a selecionada, ou a primeira disponível.
  const activeId  = selected && modalities.some((m) => m.id === selected) ? selected : modalities[0]?.id;
  const activeMod = modalities.find((m) => m.id === activeId);
  const current   = modules.filter((m) => m.category === activeId);

  function handleAddModule() {
    const name = newMod.trim();
    if (!activeId) { toast.error("Crie uma modalidade primeiro"); return; }
    if (name.length < 2) { toast.error("Informe um nome"); return; }
    if (current.some((m) => m.name.toLowerCase() === name.toLowerCase())) { toast.error("Já existe um módulo com esse nome"); return; }
    createModule.mutate({ name, category: activeId }, {
      onSuccess: () => { toast.success("Módulo adicionado"); setNewMod(""); },
      onError:   () => toast.error("Erro ao adicionar módulo"),
    });
  }

  function handleAddModality() {
    const label = newModal.trim();
    if (label.length < 2) { toast.error("Informe o nome da modalidade"); return; }
    if (modalities.some((m) => m.label.toLowerCase() === label.toLowerCase() || m.id.toLowerCase() === label.toLowerCase())) {
      toast.error("Essa modalidade já existe"); return;
    }
    createModality.mutate({ label }, {
      onSuccess: (res) => { toast.success("Modalidade criada"); setNewModal(""); setAddModal(false); setSelected(res.id); },
      onError:   () => toast.error("Erro ao criar modalidade"),
    });
  }

  function handleRenameModality() {
    if (!activeMod) return;
    const label = renameVal.trim();
    if (label.length < 2) { toast.error("Nome muito curto"); return; }
    if (label === activeMod.label) { setRenaming(false); return; }
    updateModality.mutate({ id: activeMod.id, label }, {
      onSuccess: () => { toast.success("Modalidade renomeada"); setRenaming(false); },
      onError:   () => toast.error("Erro ao renomear modalidade"),
    });
  }

  function handleDeleteModality() {
    if (!delModal) return;
    deleteModality.mutate({ id: delModal.id }, {
      onSuccess: () => { toast.success("Modalidade removida"); setDelModal(null); setSelected(null); },
      onError:   () => toast.error("Erro ao remover modalidade"),
    });
  }

  function handleDeleteModule() {
    if (!delModule) return;
    deleteModule.mutate({ id: delModule.id }, {
      onSuccess: () => { toast.success("Módulo removido"); setDelModule(null); },
      onError:   () => toast.error("Erro ao remover módulo"),
    });
  }

  return (
    <AdminLayout title="Módulos" backTo="/admin/videos">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Módulos</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Layers size={13} /> {modules.length} módulos
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Crie modalidades e organize as aulas em módulos (tópicos) dentro de cada uma — ex: Passagem de Guarda, Finalizações.
        Cada módulo vira uma seção na Home (agrupada por tópico) e aparece no cadastro de aulas, nos planos e na busca.
      </p>

      {/* ── Modalidades ─────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Modalidade</p>
        {activeMod && !renaming && !addModal && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setRenaming(true); setRenameVal(activeMod.label); }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
              <Pencil size={11} /> Renomear
            </button>
            <button onClick={() => setDelModal(activeMod)}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300">
              <Trash2 size={11} /> Remover
            </button>
          </div>
        )}
      </div>

      {/* chips de modalidade */}
      <div className="mt-2 flex flex-wrap gap-2">
        {modalities.map((m) => (
          <button key={m.id} onClick={() => { setSelected(m.id); setRenaming(false); }}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              m.id === activeId ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
            {m.label}
          </button>
        ))}
        <button onClick={() => { setAddModal(true); setNewModal(""); }}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
          <Plus size={12} /> Modalidade
        </button>
      </div>

      {/* form: renomear modalidade */}
      {renaming && activeMod && (
        <div className="mt-2 flex items-center gap-2">
          <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameModality(); if (e.key === "Escape") setRenaming(false); }}
            className={fieldCls} placeholder="Nome da modalidade" />
          <button onClick={handleRenameModality} disabled={updateModality.isPending} className="text-emerald-400 disabled:opacity-50">
            {updateModality.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </button>
          <button onClick={() => setRenaming(false)} className="text-muted-foreground"><X size={16} /></button>
        </div>
      )}

      {/* form: nova modalidade */}
      {addModal && (
        <div className="mt-2 flex items-center gap-2">
          <input value={newModal} onChange={(e) => setNewModal(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleAddModality(); if (e.key === "Escape") setAddModal(false); }}
            className={fieldCls} placeholder="Ex: MMA, Boxe, Muay Thai…" />
          <button onClick={handleAddModality} disabled={createModality.isPending}
            className="flex shrink-0 items-center gap-1 rounded-2xl btn-press bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
            {createModality.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Criar
          </button>
          <button onClick={() => setAddModal(false)} className="text-muted-foreground"><X size={16} /></button>
        </div>
      )}

      {/* ── Módulos da modalidade ativa ─────────────────────────── */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Módulos {activeMod ? `de ${activeMod.label}` : ""}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input value={newMod} onChange={(e) => setNewMod(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddModule(); }}
          placeholder={activeMod ? `Novo módulo de ${activeMod.label}…` : "Crie uma modalidade primeiro"}
          disabled={!activeMod} className={cn(fieldCls, !activeMod && "opacity-50")} />
        <button onClick={handleAddModule} disabled={createModule.isPending || !activeMod}
          className="flex shrink-0 items-center gap-1 rounded-2xl btn-press bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
          {createModule.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : current.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <Layers size={30} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {activeMod ? "Nenhum módulo nesta modalidade" : "Crie uma modalidade para começar"}
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {current.map((m) => (
            <ModuleRow key={m.id} module={m} onDelete={() => setDelModule(m)} />
          ))}
        </div>
      )}

      {/* confirmar remoção de módulo */}
      {delModule && (
        <Dialog open onOpenChange={(v) => { if (!v) setDelModule(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Remover módulo?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">
              O módulo <span className="font-semibold text-foreground">{delModule.name}</span> será removido.
              As aulas já cadastradas nele não são afetadas, mas ele deixa de aparecer no seletor.
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setDelModule(null)} className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleDeleteModule} disabled={deleteModule.isPending} className="rounded-2xl btn-press bg-red-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Remover</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* confirmar remoção de modalidade */}
      {delModal && (
        <Dialog open onOpenChange={(v) => { if (!v) setDelModal(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Remover modalidade?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">
              A modalidade <span className="font-semibold text-foreground">{delModal.label}</span> será removida.
              Os módulos e aulas ligados a ela deixam de aparecer agrupados. Você pode recriá-la depois.
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setDelModal(null)} className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleDeleteModality} disabled={deleteModality.isPending} className="rounded-2xl btn-press bg-red-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Remover</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default AdminModules;
