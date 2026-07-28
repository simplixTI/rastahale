import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, Check, BookOpen, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminVideos } from "@/hooks/useAdminData";
import { useStudioSessions, type StudioSession } from "@/hooks/useStudioSessions";
import { getLevelColor } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";

// ── SessionFormModal ──────────────────────────────────────────────────────────

interface FormModalProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  session?:     StudioSession | null;
  myVideos:     ReturnType<typeof useAdminVideos>["data"];
  onSave:       (title: string, desc: string, ids: string[]) => void;
}

function SessionFormModal({ open, onOpenChange, session, myVideos = [], onSave }: FormModalProps) {
  const [title,    setTitle]    = useState(session?.title ?? "");
  const [desc,     setDesc]     = useState(session?.description ?? "");
  const [selected, setSelected] = useState<string[]>(session?.videoIds ?? []);
  const [search,   setSearch]   = useState("");

  // reset quando abre
  useState(() => {
    if (open) {
      setTitle(session?.title ?? "");
      setDesc(session?.description ?? "");
      setSelected(session?.videoIds ?? []);
      setSearch("");
    }
  });

  const filtered = (myVideos ?? []).filter((v) =>
    !search || v.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggleVideo(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleSave() {
    if (!title.trim()) { toast.error("Informe o título da sessão"); return; }
    if (selected.length === 0) { toast.error("Selecione pelo menos um vídeo"); return; }
    onSave(title, desc, selected);
    onOpenChange(false);
  }

  const isEdit = !!session;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">
            {isEdit ? "Editar Sessão" : "Nova Sessão"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Título da sessão
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Fundamentos de Jiu-Jitsu"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Descreva o conteúdo desta sessão…"
            />
          </div>

          {/* seleção de vídeos */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Vídeos da sessão ({selected.length} selecionados)
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar vídeo…"
              className="mb-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-[11px] text-muted-foreground">Nenhum vídeo encontrado</p>
              )}
              {filtered.map((v) => {
                const isSel = selected.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVideo(v.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                      isSel ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded">
                      <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{v.title}</p>
                      <span className={cn("text-[9px] font-semibold rounded-full px-1.5 py-0.5", getLevelColor(v.level))}>
                        {v.level}
                      </span>
                    </div>
                    <div className={cn(
                      "h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                      isSel ? "border-primary bg-primary" : "border-border"
                    )}>
                      {isSel && <Check size={10} className="text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <button type="button" onClick={() => onOpenChange(false)}
            className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="rounded-2xl btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            {isEdit ? "Salvar" : "Criar Sessão"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── SessionCard ───────────────────────────────────────────────────────────────

function SessionCard({ session, videos, onEdit, onDelete }: {
  session: StudioSession;
  videos:  ReturnType<typeof useAdminVideos>["data"];
  onEdit:  () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sessionVideos   = (videos ?? []).filter((v) => session.videoIds.includes(v.id));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{session.title}</p>
          {session.description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{session.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <VideoIcon size={10} /> {sessionVideos.length} vídeo{sessionVideos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
               : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border">
          {sessionVideos.length === 0 ? (
            <p className="px-4 py-3 text-[11px] text-muted-foreground">Nenhum vídeo nesta sessão.</p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {sessionVideos.map((v, idx) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                  <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded">
                    <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-0.5 text-[8px] text-white">{v.duration}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{v.title}</p>
                    <span className={cn("text-[9px] font-semibold rounded-full px-1.5 py-0.5 inline-block mt-0.5", getLevelColor(v.level))}>
                      {v.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex border-t border-border">
        <button onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors">
          <Edit2 size={12} /> Editar
        </button>
        <button onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 size={12} /> Remover
        </button>
      </div>
    </div>
  );
}

// ── StudioSessoes ─────────────────────────────────────────────────────────────

const StudioSessoes = () => {
  const { user }                             = useAuth();
  const { data: allVideos = [] }             = useAdminVideos();
  const { sessions, create, update, remove } = useStudioSessions(user?.id ?? "");

  const myVideos = allVideos.filter((v) => v.instructorId === user?.id);

  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState<StudioSession | null>(null);
  const [deleting,   setDeleting]   = useState<StudioSession | null>(null);

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
            <div>
              <p className="text-xs font-bold text-foreground leading-none">Sessões</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-2xl btn-press bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus size={12} /> Nova
          </button>
        </div>
      </header>

      {/* modal criar */}
      <SessionFormModal
        open={showCreate}
        onOpenChange={setShowCreate}
        myVideos={myVideos}
        onSave={(t, d, ids) => { create(t, d, ids); toast.success("Sessão criada!"); }}
      />

      {/* modal editar */}
      {editing && (
        <SessionFormModal
          open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          session={editing}
          myVideos={myVideos}
          onSave={(t, d, ids) => { update(editing.id, t, d, ids); toast.success("Sessão atualizada!"); setEditing(null); }}
        />
      )}

      {/* confirm delete */}
      {deleting && (
        <Dialog open onOpenChange={(v) => { if (!v) setDeleting(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground">Remover sessão?</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              A sessão <span className="font-semibold text-foreground">"{deleting.title}"</span> será removida.
              Os vídeos não são afetados.
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setDeleting(null)} className="rounded-2xl btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                Cancelar
              </button>
              <button onClick={() => { remove(deleting.id); toast.success("Sessão removida"); setDeleting(null); }}
                className="rounded-2xl btn-press bg-red-500 px-4 py-2 text-xs font-medium text-white">
                Remover
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="px-4 pt-5">
        {/* stats */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <BookOpen size={15} className="mx-auto text-primary" />
            <p className="mt-1 text-xl font-bold text-foreground">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground">Sessões</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <VideoIcon size={15} className="mx-auto text-amber-400" />
            <p className="mt-1 text-xl font-bold text-foreground">{myVideos.length}</p>
            <p className="text-[10px] text-muted-foreground">Vídeos disponíveis</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <BookOpen size={40} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Nenhuma sessão criada</p>
            <p className="text-xs text-muted-foreground">Organize seus vídeos em sessões temáticas.</p>
            <button onClick={() => setShowCreate(true)}
              className="rounded-2xl btn-press bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
              Criar primeira sessão
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                videos={myVideos}
                onEdit={() => setEditing(s)}
                onDelete={() => setDeleting(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioSessoes;
