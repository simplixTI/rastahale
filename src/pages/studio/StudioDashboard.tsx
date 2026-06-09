import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, BookOpen, Eye, EyeOff, Upload, Edit2, Image,
  Check, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAdminVideos, useCreateVideo, useToggleVideoVisibility,
  useUpdateVideo, useUpdateVideoThumbnail,
} from "@/hooks/useAdminData";
import VideoFormModal from "@/components/VideoFormModal";
import { getLevelColor, getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

// ── helpers ────────────────────────────────────────────────────────────────────

function isMockMode(): boolean {
  try {
    const saved = sessionStorage.getItem("rasta_auth_user");
    if (!saved) return true;
    const { id } = JSON.parse(saved) as { id: string };
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  } catch { return true; }
}

async function uploadFile(file: File, folder: string, onProgress?: (p: number) => void): Promise<string | null> {
  const path = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  try {
    const { supabase } = await import("@/lib/supabase");
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

  function handleUrl() {
    if (!url.trim()) { toast.error("Informe a URL"); return; }
    updateThumbnail.mutate({ videoId, thumbnail: url.trim() }, {
      onSuccess: () => { toast.success("Thumbnail atualizada"); onClose(); },
      onError:   () => toast.error("Erro ao atualizar"),
    });
  }

  return (
    <div className="border-t border-border bg-secondary/20 px-3 py-2.5 space-y-2">
      <input
        type="file" accept="image/*" className="hidden"
        id={`thumb-file-${videoId}`}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <div className="flex items-center gap-1.5">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... (URL)"
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-primary" />
        <button onClick={handleUrl} disabled={updateThumbnail.isPending} className="text-emerald-400 disabled:opacity-50"><Check size={13} /></button>
        <button onClick={onClose} className="text-muted-foreground"><X size={13} /></button>
      </div>
      <label htmlFor={`thumb-file-${videoId}`}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
        {uploading
          ? <><Loader2 size={11} className="animate-spin" /> Enviando… {progress}%</>
          : <><Upload size={11} /> Enviar arquivo</>}
      </label>
      {uploading && progress > 0 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

// ── VideoRow ──────────────────────────────────────────────────────────────────

type AdminVideo = { id: string; title: string; thumbnail: string; duration: string; category: "jiu-jitsu" | "luta-livre"; subcategory: string; level: "Iniciante" | "Intermediário" | "Avançado"; visible: boolean; description: string; instructorId: string; unlockByProgress: boolean; requiredProgress: number; videoUrl: string | null };

function VideoRow({ v, onEdit }: { v: AdminVideo; onEdit: () => void }) {
  const toggleVisibility           = useToggleVideoVisibility();
  const [thumbOpen, setThumbOpen]  = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
          {!v.visible && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <EyeOff size={12} className="text-white" />
            </div>
          )}
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">{v.duration}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
          <p className="text-[10px] text-muted-foreground">{getCategoryLabel(v.category)} · {v.subcategory}</p>
          <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold", getLevelColor(v.level))}>
            {v.level}
          </span>
        </div>
      </div>

      {thumbOpen && <ThumbInlineEdit videoId={v.id} onClose={() => setThumbOpen(false)} />}

      <div className="flex border-t border-border">
        <button onClick={() => setThumbOpen((o) => !o)}
          className={cn("flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium border-r border-border transition-colors",
            thumbOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary/50")}>
          <Image size={11} /> Thumb
        </button>
        <button onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground border-r border-border hover:bg-secondary/50 transition-colors">
          <Edit2 size={11} /> Editar
        </button>
        <button
          onClick={() => toggleVisibility.mutate(
            { videoId: v.id, visible: !v.visible },
            { onSuccess: () => toast.success(v.visible ? "Aula ocultada" : "Aula publicada") }
          )}
          className={cn("flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
            v.visible ? "text-emerald-400 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-secondary/50")}>
          {v.visible ? <Eye size={11} /> : <EyeOff size={11} />}
          {v.visible ? "Visível" : "Oculta"}
        </button>
      </div>
    </div>
  );
}

// ── StudioDashboard ───────────────────────────────────────────────────────────

const StudioDashboard = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const { data: allVideos = [], isLoading } = useAdminVideos();
  const createVideo                         = useCreateVideo();
  const updateVideo                         = useUpdateVideo();

  const [showUpload,  setShowUpload]  = useState(false);
  const [editingVideo, setEditing]    = useState<AdminVideo | null>(null);

  const myVideos     = allVideos.filter((v) => v.instructorId === user?.id) as AdminVideo[];
  const totalVisible = myVideos.filter((v) => v.visible).length;
  const totalHidden  = myVideos.length - totalVisible;

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-10">
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
            <EyeOff size={14} className="mx-auto text-amber-400" />
            <p className="mt-1 text-lg font-bold text-foreground">{totalHidden}</p>
            <p className="text-[9px] text-muted-foreground">Ocultas</p>
          </div>
        </div>

        {/* upload */}
        <button onClick={() => setShowUpload(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Upload size={16} /> Enviar nova aula
        </button>

        {/* lista */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground">Suas aulas</h2>
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
              {myVideos.map((v) => (
                <VideoRow key={v.id} v={v} onEdit={() => setEditing(v)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* modal: nova aula */}
      <VideoFormModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onSubmit={(values) => {
          if (!user) return;
          createVideo.mutate(
            { ...values, instructorId: user.id, videoUrl: values.videoUrl || null } as Parameters<typeof createVideo.mutate>[0],
            {
              onSuccess: () => { toast.success("Aula enviada!"); setShowUpload(false); },
              onError:   () => toast.error("Erro ao enviar aula"),
            }
          );
        }}
        isPending={createVideo.isPending}
      />

      {/* modal: editar aula */}
      <VideoFormModal
        open={!!editingVideo}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        video={editingVideo}
        onSubmit={(values) => {
          if (!editingVideo) return;
          updateVideo.mutate(
            { id: editingVideo.id, ...values, videoUrl: values.videoUrl || null },
            {
              onSuccess: () => { toast.success("Aula atualizada!"); setEditing(null); },
              onError:   () => toast.error("Erro ao atualizar"),
            }
          );
        }}
        isPending={updateVideo.isPending}
      />
    </div>
  );
};

export default StudioDashboard;
