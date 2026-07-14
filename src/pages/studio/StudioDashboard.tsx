import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, BookOpen, Eye, EyeOff, Upload, Edit2, Image,
  Check, X, Loader2, Video as VideoIcon, LayoutList,
  ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminVideos, useCreateVideo, useToggleVideoVisibility,
  useUpdateVideo, useUpdateVideoThumbnail, useDeleteVideo,
} from "@/hooks/useAdminData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useStudioSessions, type StudioSession } from "@/hooks/useStudioSessions";
import VideoFormModal from "@/components/VideoFormModal";
import { getLevelColor, getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ── helpers ────────────────────────────────────────────────────────────────────

// Modo demo = Supabase não configurado. O instrutor loga com id "inst-…" (não
// UUID); usar heurística de UUID marcaria a sessão como mock e o Studio leria
// vídeos mock em vez dos reais do Supabase.
function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

async function uploadFile(file: File, folder: string, onProgress?: (p: number) => void): Promise<string | null> {
  const path = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = { upsert: false, onUploadProgress: onProgress ? ({ loaded, total }: { loaded: number; total: number }) => { if (total) onProgress(Math.round((loaded / total) * 100)); } : undefined };
    const { error } = await supabase.storage.from("media").upload(path, file, opts);
    if (error) return null;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  } catch { return null; }
}

// ── ThumbInlineEdit ──────────────────────────────────────────────────────────

function ThumbInlineEdit({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const updateThumbnail        = useUpdateVideoThumbnail();
  const [url,       setUrl]    = useState("");
  const [uploading, setUp]     = useState(false);
  const [progress,  setProg]   = useState(0);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    setUp(true); setProg(0);
    const resolved = isMockMode() ? URL.createObjectURL(file) : await uploadFile(file, "thumbnails", setProg);
    if (isMockMode()) setProg(100);
    if (!resolved) { toast.error("Erro ao enviar"); setUp(false); return; }
    updateThumbnail.mutate({ videoId, thumbnail: resolved }, {
      onSuccess: () => { toast.success("Thumbnail atualizada"); onClose(); },
      onError:   () => toast.error("Erro ao atualizar"),
    });
    setUp(false);
  }

  return (
    <div className="border-t border-border bg-secondary/20 px-3 py-2.5 space-y-2">
      <input type="file" accept="image/*" className="hidden" id={`thumb-file-${videoId}`}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <div className="flex items-center gap-1.5">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... (URL)"
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary" />
        <button onClick={() => { if (!url.trim()) { toast.error("Informe a URL"); return; } updateThumbnail.mutate({ videoId, thumbnail: url.trim() }, { onSuccess: () => { toast.success("Thumbnail atualizada"); onClose(); }, onError: () => toast.error("Erro") }); }} disabled={updateThumbnail.isPending} className="text-emerald-400 disabled:opacity-50"><Check size={13} /></button>
        <button onClick={onClose} className="text-muted-foreground"><X size={13} /></button>
      </div>
      <label htmlFor={`thumb-file-${videoId}`}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
        {uploading ? <><Loader2 size={11} className="animate-spin" /> Enviando… {progress}%</> : <><Upload size={11} /> Enviar arquivo</>}
      </label>
    </div>
  );
}

// ── VideoRow ──────────────────────────────────────────────────────────────────

type AdminVideo = { id: string; title: string; thumbnail: string; duration: string; category: "jiu-jitsu" | "luta-livre"; subcategory: string; level: "Iniciante" | "Intermediário" | "Avançado"; visible: boolean; description: string; instructorId: string; unlockByProgress: boolean; requiredProgress: number; videoUrl: string | null };

function VideoRow({ v, onEdit }: { v: AdminVideo; onEdit: () => void }) {
  const toggleVisibility          = useToggleVideoVisibility();
  const [thumbOpen, setThumbOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
          {!v.visible && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><EyeOff size={12} className="text-white" /></div>}
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">{v.duration}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
          <p className="text-[10px] text-muted-foreground">{getCategoryLabel(v.category)} · {v.subcategory}</p>
          <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold", getLevelColor(v.level))}>{v.level}</span>
        </div>
      </div>
      {thumbOpen && <ThumbInlineEdit videoId={v.id} onClose={() => setThumbOpen(false)} />}
      <div className="flex border-t border-border">
        <button onClick={() => setThumbOpen((o) => !o)}
          className={cn("flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium border-r border-border transition-colors", thumbOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary/50")}>
          <Image size={11} /> Thumb
        </button>
        <button onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors">
          <Edit2 size={11} /> Editar
        </button>
        <button
          onClick={() => toggleVisibility.mutate({ videoId: v.id, visible: !v.visible }, { onSuccess: () => toast.success(v.visible ? "Aula ocultada" : "Aula publicada") })}
          className={cn("flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors", v.visible ? "text-emerald-400 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-secondary/50")}>
          {v.visible ? <Eye size={11} /> : <EyeOff size={11} />}
          {v.visible ? "Visível" : "Oculta"}
        </button>
      </div>
    </div>
  );
}

// ── SessionFormModal ──────────────────────────────────────────────────────────

function SessionFormModal({ open, onOpenChange, session, myVideos, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  session?: StudioSession | null; myVideos: AdminVideo[];
  onSave: (title: string, desc: string, ids: string[]) => void;
}) {
  const [title,    setTitle]    = useState(session?.title ?? "");
  const [desc,     setDesc]     = useState(session?.description ?? "");
  const [selected, setSelected] = useState<string[]>(session?.videoIds ?? []);
  const [search,   setSearch]   = useState("");

  useState(() => {
    if (open) { setTitle(session?.title ?? ""); setDesc(session?.description ?? ""); setSelected(session?.videoIds ?? []); setSearch(""); }
  });

  const filtered = myVideos.filter((v) => !search || v.title.toLowerCase().includes(search.toLowerCase()));

  function toggleVideo(id: string) { setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); }

  function handleSave() {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    if (selected.length === 0) { toast.error("Selecione pelo menos um vídeo"); return; }
    onSave(title, desc, selected);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">{session ? "Editar Sessão" : "Nova Sessão"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ex: Fundamentos de Jiu-Jitsu" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Descrição (opcional)</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Descrição da sessão…" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Vídeos ({selected.length} selecionados)
            </label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vídeo…"
              className="mb-2 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2">
              {filtered.length === 0 && <p className="py-4 text-center text-[11px] text-muted-foreground">Nenhum vídeo</p>}
              {filtered.map((v) => {
                const isSel = selected.includes(v.id);
                return (
                  <button key={v.id} type="button" onClick={() => toggleVideo(v.id)}
                    className={cn("flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                      isSel ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}>
                    <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded">
                      <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{v.title}</p>
                      <span className={cn("text-[9px] font-semibold rounded-full px-1.5 py-0.5", getLevelColor(v.level))}>{v.level}</span>
                    </div>
                    <div className={cn("h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors", isSel ? "border-primary bg-primary" : "border-border")}>
                      {isSel && <Check size={10} className="text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
          <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            {session ? "Salvar" : "Criar Sessão"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── SessionCard ───────────────────────────────────────────────────────────────

function SessionCard({ session, videos, onEdit, onDelete }: {
  session: StudioSession; videos: AdminVideo[]; onEdit: () => void; onDelete: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const sessionVideos         = videos.filter((v) => session.videoIds.includes(v.id));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{session.title}</p>
          {session.description && <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{session.description}</p>}
          <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <VideoIcon size={10} /> {sessionVideos.length} vídeo{sessionVideos.length !== 1 ? "s" : ""}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
               : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {open && sessionVideos.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {sessionVideos.map((v, idx) => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
              <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded">
                <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-0.5 text-[8px] text-white">{v.duration}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground truncate">{v.title}</p>
                <span className={cn("text-[9px] font-semibold rounded-full px-1.5 py-0.5 inline-block mt-0.5", getLevelColor(v.level))}>{v.level}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex border-t border-border">
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors">
          <Edit2 size={12} /> Editar
        </button>
        <button onClick={onDelete} className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 size={12} /> Remover
        </button>
      </div>
    </div>
  );
}

// ── StudioDashboard ───────────────────────────────────────────────────────────

const StudioDashboard = () => {
  const { user }                             = useAuth();
  const navigate                             = useNavigate();
  const { data: allVideos = [], isLoading }  = useAdminVideos();
  const createVideo                          = useCreateVideo();
  const updateVideo                          = useUpdateVideo();
  const deleteVideo                          = useDeleteVideo();
  const { sessions, create, update, remove } = useStudioSessions(user?.id ?? "");

  const [tab,          setTab]         = useState<"aulas" | "sessoes">("aulas");
  const [showUpload,   setShowUpload]  = useState(false);
  const [editingVideo, setEditing]     = useState<AdminVideo | null>(null);
  const [showSessForm, setShowSessForm] = useState(false);
  const [editSess,     setEditSess]    = useState<StudioSession | null>(null);
  const [delSess,      setDelSess]     = useState<StudioSession | null>(null);

  const myVideos     = allVideos.filter((v) => v.instructorId === user?.id) as AdminVideo[];
  const totalVisible = myVideos.filter((v) => v.visible).length;
  const totalHidden  = myVideos.length - totalVisible;

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
            <div>
              <p className="text-xs font-bold text-foreground leading-none">Studio</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.name}</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">Instrutor</span>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* boas-vindas */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Bem-vindo ao seu studio,</p>
          <p className="text-base font-bold text-foreground">{user?.name} 👋</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Gerencie suas aulas e publique novo conteúdo.</p>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card p-2.5 text-center">
            <BookOpen size={14} className="mx-auto text-primary" />
            <p className="mt-1 text-lg font-bold text-foreground">{myVideos.length}</p>
            <p className="text-[9px] text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2.5 text-center">
            <Eye size={14} className="mx-auto text-emerald-400" />
            <p className="mt-1 text-lg font-bold text-foreground">{totalVisible}</p>
            <p className="text-[9px] text-muted-foreground">Publicadas</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-2.5 text-center">
            <LayoutList size={14} className="mx-auto text-amber-400" />
            <p className="mt-1 text-lg font-bold text-foreground">{sessions.length}</p>
            <p className="text-[9px] text-muted-foreground">Sessões</p>
          </div>
        </div>

        {/* tabs internas: Aulas / Sessões */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setTab("aulas")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
              tab === "aulas" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}>
            <VideoIcon size={14} /> Aulas
          </button>
          <button
            onClick={() => setTab("sessoes")}
            className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
              tab === "sessoes" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}>
            <LayoutList size={14} /> Sessões
          </button>
        </div>

        {/* ── AULAS ─────────────────────────────────────────────────── */}
        {tab === "aulas" && (
          <>
            <button onClick={() => setShowUpload(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <Upload size={16} /> Enviar nova aula
            </button>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : myVideos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Plus size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma aula ainda.</p>
                <p className="text-xs text-muted-foreground">Clique em "Enviar nova aula" para começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myVideos.map((v) => <VideoRow key={v.id} v={v} onEdit={() => setEditing(v)} />)}
              </div>
            )}
          </>
        )}

        {/* ── SESSÕES ───────────────────────────────────────────────── */}
        {tab === "sessoes" && (
          <>
            <button onClick={() => setShowSessForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus size={16} /> Criar nova sessão
            </button>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <LayoutList size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma sessão criada.</p>
                <p className="text-xs text-muted-foreground">Organize seus vídeos em sessões temáticas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} videos={myVideos}
                    onEdit={() => setEditSess(s)} onDelete={() => setDelSess(s)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* modais */}
      <VideoFormModal open={showUpload} onOpenChange={setShowUpload}
        onSubmit={(values) => {
          if (!user) return;
          createVideo.mutate(
            { ...values, instructorId: user.id, videoUrl: values.videoUrl || null } as Parameters<typeof createVideo.mutate>[0],
            { onSuccess: () => { toast.success("Aula enviada!"); setShowUpload(false); }, onError: () => toast.error("Erro ao enviar aula") }
          );
        }} isPending={createVideo.isPending} hideInstructor autoDuration />

      <VideoFormModal open={!!editingVideo} onOpenChange={(v) => { if (!v) setEditing(null); }}
        video={editingVideo}
        onSubmit={(values) => {
          if (!editingVideo) return;
          updateVideo.mutate({ id: editingVideo.id, ...values, videoUrl: values.videoUrl || null },
            { onSuccess: () => { toast.success("Aula atualizada!"); setEditing(null); }, onError: () => toast.error("Erro ao atualizar") }
          );
        }} isPending={updateVideo.isPending}
        onDelete={() => {
          if (!editingVideo) return;
          deleteVideo.mutate(editingVideo.id, {
            onSuccess: () => { toast.success("Aula excluída"); setEditing(null); },
            onError:   () => toast.error("Erro ao excluir"),
          });
        }} isDeleting={deleteVideo.isPending} hideInstructor autoDuration />

      <SessionFormModal open={showSessForm} onOpenChange={setShowSessForm} myVideos={myVideos}
        onSave={(t, d, ids) => { create(t, d, ids); toast.success("Sessão criada!", { duration: 1500 }); }} />

      {editSess && (
        <SessionFormModal open={!!editSess} onOpenChange={(v) => { if (!v) setEditSess(null); }}
          session={editSess} myVideos={myVideos}
          onSave={(t, d, ids) => { update(editSess.id, t, d, ids); toast.success("Sessão atualizada!", { duration: 1500 }); setEditSess(null); }} />
      )}

      {delSess && (
        <Dialog open onOpenChange={(v) => { if (!v) setDelSess(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Remover sessão?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">A sessão <span className="font-semibold text-foreground">"{delSess.title}"</span> será removida. Os vídeos não são afetados.</p>
            <DialogFooter className="pt-2">
              <button onClick={() => setDelSess(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={() => { remove(delSess.id); toast.success("Sessão removida", { duration: 1500 }); setDelSess(null); }} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white">Remover</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StudioDashboard;
