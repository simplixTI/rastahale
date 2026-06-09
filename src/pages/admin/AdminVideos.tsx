import { useState, useMemo } from "react";
import { Eye, EyeOff, Lock, Unlock, Edit2, Plus, Image, ChevronDown, Video as VideoIcon, FolderOpen, Check, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useAdminVideos, useToggleVideoVisibility, useToggleVideoLock, useCreateVideo, useUpdateVideo, useUpdateVideoThumbnail } from "@/hooks/useAdminData";
import { videoCategories, getLevelColor, getCategoryLabel } from "@/data/mockData";
import { cn } from "@/lib/utils";
import VideoFormModal from "@/components/VideoFormModal";

const levels = ["Todos", "Iniciante", "Intermediário", "Avançado"] as const;

const AdminVideos = () => {
  const { data: videos = [], isLoading } = useAdminVideos();
  const toggleVisibility = useToggleVideoVisibility();
  const toggleLock = useToggleVideoLock();
  const createVideo = useCreateVideo();
  const updateVideo = useUpdateVideo();
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedLevel, setSelectedLevel] = useState<string>("Todos");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const updateThumbnail = useUpdateVideoThumbnail();
  const [showUpload, setShowUpload] = useState(false);
  type AdminVideo = typeof videos[number];
  const [editingVideo, setEditingVideo] = useState<AdminVideo | null>(null);
  const [thumbEditId, setThumbEditId] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState("");

  const allCategories = ["Todas", ...videoCategories];

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      const matchesCat = selectedCategory === "Todas" || v.subcategory === selectedCategory;
      const matchesLvl = selectedLevel === "Todos" || v.level === selectedLevel;
      return matchesCat && matchesLvl;
    });
  }, [videos, selectedCategory, selectedLevel]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((v) => {
      if (!map[v.subcategory]) map[v.subcategory] = [];
      map[v.subcategory].push(v);
    });
    return map;
  }, [filtered]);

  return (
    <AdminLayout title="Vídeos">
      <VideoFormModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onSubmit={(values) => {
          createVideo.mutate({ ...values, videoUrl: values.videoUrl || null } as Parameters<typeof createVideo.mutate>[0], { onSuccess: () => setShowUpload(false) });
        }}
        isPending={createVideo.isPending}
      />
      <VideoFormModal
        open={!!editingVideo}
        onOpenChange={(v) => { if (!v) setEditingVideo(null); }}
        video={editingVideo}
        onSubmit={(values) => {
          if (editingVideo) {
            updateVideo.mutate(
              { id: editingVideo.id, ...values, videoUrl: values.videoUrl || null },
              { onSuccess: () => setEditingVideo(null) }
            );
          }
        }}
        isPending={updateVideo.isPending}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Gerenciar Vídeos</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus size={12} /> Upload
        </button>
      </div>

      <div className="mt-3 flex gap-2 text-xs">
        {[
          { label: "Total",    value: videos.length,                          className: "text-foreground"  },
          { label: "Visíveis", value: videos.filter((v) => v.visible).length, className: "text-emerald-400" },
          { label: "Ocultos",  value: videos.filter((v) => !v.visible).length, className: "text-red-400"   },
          { label: "Travados", value: videos.filter((v) => v.unlockByProgress).length, className: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-2 text-center">
            <p className={cn("text-base font-bold", s.className)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</p>
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                selectedCategory === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nível</p>
        <div className="flex gap-1.5">
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setSelectedLevel(l)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                selectedLevel === l ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {Object.entries(grouped).map(([cat, catVids]) => (
            <div key={cat} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                className="flex w-full items-center justify-between p-3"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">{cat}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {catVids.length}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={cn("text-muted-foreground transition-transform", expandedCategory === cat && "rotate-180")}
                />
              </button>

              {(expandedCategory === cat || selectedCategory !== "Todas") && (
                <div className="border-t border-border">
                  {catVids.map((v) => (
                    <div key={v.id} className="border-b border-border last:border-b-0">
                      <div className="flex gap-3 p-3">
                        <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                          <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                          {!v.visible && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <EyeOff size={14} className="text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
                          <p className="text-[10px] text-muted-foreground">{getCategoryLabel(v.category)} · {v.duration}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", getLevelColor(v.level))}>
                              {v.level}
                            </span>
                            {v.unlockByProgress && (
                              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-400">
                                🔒 {v.requiredProgress}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex border-t border-border/50 bg-secondary/30">
                        <button
                          onClick={() => toggleVisibility.mutate({ videoId: v.id, visible: !v.visible })}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium border-r border-border/50",
                            v.visible ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {v.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                          {v.visible ? "Visível" : "Oculto"}
                        </button>
                        <button
                          onClick={() => toggleLock.mutate({ videoId: v.id, unlockByProgress: !v.unlockByProgress, requiredProgress: v.requiredProgress ?? 0 })}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium border-r border-border/50",
                            v.unlockByProgress ? "text-blue-400" : "text-muted-foreground"
                          )}
                        >
                          {v.unlockByProgress ? <Lock size={11} /> : <Unlock size={11} />}
                          Progresso
                        </button>
                        {thumbEditId === v.id ? (
                          <div className="flex flex-1 items-center gap-1 px-2 py-1 border-r border-border/50">
                            <input
                              autoFocus
                              value={thumbUrl}
                              onChange={(e) => setThumbUrl(e.target.value)}
                              placeholder="https://..."
                              className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground outline-none"
                            />
                            <button
                              onClick={() => {
                                if (!thumbUrl.trim()) { toast.error("Informe a URL da thumbnail"); return; }
                                updateThumbnail.mutate(
                                  { videoId: v.id, thumbnail: thumbUrl.trim() },
                                  {
                                    onSuccess: () => { toast.success("Thumbnail atualizada"); setThumbEditId(null); setThumbUrl(""); },
                                    onError:   () => toast.error("Erro ao atualizar thumbnail"),
                                  }
                                );
                              }}
                              className="text-emerald-400"
                            >
                              <Check size={12} />
                            </button>
                            <button onClick={() => { setThumbEditId(null); setThumbUrl(""); }} className="text-muted-foreground">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setThumbEditId(v.id); setThumbUrl(v.thumbnail ?? ""); }}
                            className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground border-r border-border/50 hover:text-foreground"
                          >
                            <Image size={11} /> Thumb
                          </button>
                        )}
                        <button
                          onClick={() => setEditingVideo(v)}
                          className="flex flex-1 items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground"
                        >
                          <Edit2 size={11} /> Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-10 text-center">
          <VideoIcon size={32} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum vídeo encontrado</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminVideos;
